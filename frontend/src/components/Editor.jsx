import React, { useEffect, useRef, useState } from 'react';
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/php/php";
import "codemirror/mode/go/go";
import "codemirror/mode/rust/rust";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from '../Actions';
import { debouncedGetAISuggestion, cancelPendingSuggestion } from '../services/aiService';

const LANGUAGE_MODES = {
    javascript: { name: 'javascript', json: true },
    python: { name: 'python' },
    java: { name: 'text/x-java' },
    cpp: { name: 'text/x-c++src' },
    c: { name: 'text/x-csrc' },
    ruby: { name: 'ruby' },
    php: { name: 'php' },
    go: { name: 'go' },
    rust: { name: 'rust' },
};

// Generate a consistent color for a username
const generateUserColor = (username) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const Editor = ({ socketRef, roomId, onCodeChange, initialCode, username, language = 'javascript' }) => {
    const editorRef = useRef(null);
    const textareaRef = useRef(null);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const suggestionWidgetRef = useRef(null);
    const remoteCursorsRef = useRef({}); // Store remote cursor elements by socketId
    const lastCursorEmitRef = useRef(0); // Throttle cursor emissions
    const userColor = useRef(generateUserColor(username || 'user'));

    // Update userColor when username changes
    useEffect(() => {
        if (username) {
            userColor.current = generateUserColor(username);
        }
    }, [username]);

    useEffect(() => {
        if (!textareaRef.current) return;
        
        // Prevent re-initialization if editor already exists
        if (editorRef.current) return;

        editorRef.current = Codemirror.fromTextArea(textareaRef.current, {
            mode: LANGUAGE_MODES[language],
            theme: 'dracula',
            autoCloseTags: true,
            autoCloseBrackets: true,
            lineNumbers: true,
        });

        // Add keyboard handler for AI suggestions on the wrapper element
        const wrapperElement = editorRef.current.getWrapperElement();
        const handleKeyDown = (event) => {
            // Tab to accept suggestion
            if (event.key === 'Tab' && suggestionWidgetRef.current) {
                const suggestionText = suggestionWidgetRef.current.textContent;
                if (suggestionText) {
                    event.preventDefault();
                    event.stopPropagation();
                    const cursor = editorRef.current.getCursor();
                    editorRef.current.replaceRange(suggestionText, cursor);
                    setAiSuggestion(null);
                }
            }
            // ESC to dismiss suggestion
            if (event.key === 'Escape' && suggestionWidgetRef.current) {
                event.preventDefault();
                setAiSuggestion(null);
            }
        };
        
        // Use capture phase to intercept before CodeMirror
        wrapperElement.addEventListener('keydown', handleKeyDown, true);

        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes;
            const code = instance.getValue();
            onCodeChange(code);

            if (origin !== 'setValue') {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }

            // Clear suggestion immediately when user types
            if (origin === '+input' || origin === '+delete') {
                setAiSuggestion(null);
                if (suggestionWidgetRef.current) {
                    suggestionWidgetRef.current.remove();
                    suggestionWidgetRef.current = null;
                }
            }

            // Trigger AI suggestion (debounced) - only when user is typing
            if (origin === '+input' && code.trim().length > 0) {
                const cursor = instance.getCursor();
                const cursorPosition = instance.indexFromPos(cursor);
                
                debouncedGetAISuggestion(code, cursorPosition, language, (suggestion) => {
                    if (suggestion) {
                        setAiSuggestion(suggestion);
                    }
                });
            }
        });

        // Cleanup function to destroy editor instance
        return () => {
            cancelPendingSuggestion();
            if (suggestionWidgetRef.current) {
                suggestionWidgetRef.current.remove();
                suggestionWidgetRef.current = null;
            }
            if (editorRef.current) {
                const wrapper = editorRef.current.getWrapperElement();
                if (wrapper) {
                    wrapper.removeEventListener('keydown', handleKeyDown, true);
                }
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };

    }, []);

    useEffect(() => {
        if (!socketRef.current) return;

        const codeHandler = ({ code }) => {
            if (code !== null && editorRef.current) {
                editorRef.current.setValue(code);
            }
        };

        socketRef.current.on(ACTIONS.CODE_CHANGE, codeHandler);

        // Handle remote cursor positions
        const cursorHandler = ({ username: remoteUsername, cursor, color, socketId }) => {
            if (!editorRef.current || !cursor) return;

            // Remove old cursor marker for this user
            if (remoteCursorsRef.current[socketId]) {
                remoteCursorsRef.current[socketId].remove();
            }

            // Create cursor marker element
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.innerHTML = `
                <div class="remote-cursor-caret" style="background-color: ${color}"></div>
                <div class="remote-cursor-label" style="background-color: ${color}">${remoteUsername}</div>
            `;

            // Add cursor at position
            editorRef.current.addWidget(cursor, cursorEl, false);
            remoteCursorsRef.current[socketId] = cursorEl;

            // Auto-remove after 5 seconds of inactivity
            setTimeout(() => {
                if (remoteCursorsRef.current[socketId] === cursorEl) {
                    cursorEl.remove();
                    delete remoteCursorsRef.current[socketId];
                }
            }, 5000);
        };

        socketRef.current.on(ACTIONS.CURSOR_POSITION, cursorHandler);

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, codeHandler);
            socketRef.current.off(ACTIONS.CURSOR_POSITION, cursorHandler);
        };

    }, [socketRef.current]);

    // Update editor mode when language prop changes
    useEffect(() => {
        if (editorRef.current && language) {
            editorRef.current.setOption('mode', LANGUAGE_MODES[language] || LANGUAGE_MODES['javascript']);
        }
    }, [language]);

    // Track and emit cursor position only when TYPING (not just moving cursor)
    useEffect(() => {
        if (!editorRef.current || !socketRef.current || !username) return;

        const handleTyping = (instance, changes) => {
            const { origin } = changes;
            // Only emit cursor position when user is actually typing
            if (origin !== '+input' && origin !== '+delete') return;

            const now = Date.now();
            // Throttle: emit at most every 100ms
            if (now - lastCursorEmitRef.current < 100) return;
            lastCursorEmitRef.current = now;

            const cursor = instance.getCursor();
            socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
                roomId,
                username,
                cursor: { line: cursor.line, ch: cursor.ch },
                color: userColor.current
            });
        };

        editorRef.current.on('change', handleTyping);

        return () => {
            if (editorRef.current) {
                editorRef.current.off('change', handleTyping);
            }
        };
    }, [socketRef.current, roomId, username]);

    // Set initial code when it's loaded from backend
    useEffect(() => {
        if (initialCode && editorRef.current) {
            const currentCode = editorRef.current.getValue();
            // Only set if editor is empty (avoid overwriting user's work)
            if (!currentCode || currentCode.trim() === '') {
                editorRef.current.setValue(initialCode);
            }
        }
    }, [initialCode]);

    // Render AI suggestion as ghost text
    useEffect(() => {
        if (!editorRef.current) {
            return;
        }

        // Clear previous widget if it exists
        if (suggestionWidgetRef.current) {
            suggestionWidgetRef.current.remove();
            suggestionWidgetRef.current = null;
        }

        // Only create new widget if there's a suggestion
        if (!aiSuggestion) {
            return;
        }

        const cursor = editorRef.current.getCursor();
        
        // Create ghost text element
        const ghostText = document.createElement('span');
        ghostText.textContent = aiSuggestion;
        ghostText.className = 'ai-suggestion-ghost';
        ghostText.style.color = '#888';
        ghostText.style.fontStyle = 'italic';
        ghostText.style.opacity = '0.6';
        ghostText.style.pointerEvents = 'none';
        
        // Add widget at cursor position and store the DOM element
        editorRef.current.addWidget(cursor, ghostText, false);
        suggestionWidgetRef.current = ghostText;
        
        return () => {
            if (suggestionWidgetRef.current) {
                suggestionWidgetRef.current.remove();
                suggestionWidgetRef.current = null;
            }
        };
    }, [aiSuggestion]);

    return (
        <div className="editorContainer">
            <textarea ref={textareaRef}></textarea>
        </div>
    );
};

export default Editor;
