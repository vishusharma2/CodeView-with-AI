import React, { useEffect, useRef, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ACTIONS from '../Actions';
import { debouncedGetAISuggestion, cancelPendingSuggestion } from '../services/aiService';

// Monaco language mappings
const LANGUAGE_MAP = {
    javascript: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    ruby: 'ruby',
    php: 'php',
    go: 'go',
    rust: 'rust',
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
    const monacoRef = useRef(null);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const aiSuggestionRef = useRef(null); // Ref to track current suggestion
    const decorationsRef = useRef([]);
    const remoteCursorsRef = useRef({});
    const lastCursorEmitRef = useRef(0);
    const userColor = useRef(generateUserColor(username || 'user'));
    const isRemoteChange = useRef(false);

    // Keep suggestion ref in sync with state
    useEffect(() => {
        aiSuggestionRef.current = aiSuggestion;
    }, [aiSuggestion]);

    // Update userColor when username changes
    useEffect(() => {
        if (username) {
            userColor.current = generateUserColor(username);
        }
    }, [username]);

    // Handle editor mount
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Set initial code if available
        if (initialCode) {
            editor.setValue(initialCode);
        }

        // Listen for content changes
        editor.onDidChangeModelContent((event) => {
            if (isRemoteChange.current) return;

            const code = editor.getValue();
            onCodeChange(code);

            // Emit code change to other users
            if (socketRef.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }

            // Clear AI suggestion on user input
            setAiSuggestion(null);
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

            // Trigger AI suggestion (debounced)
            if (code.trim().length > 0) {
                const position = editor.getPosition();
                const cursorPosition = editor.getModel().getOffsetAt(position);
                
                debouncedGetAISuggestion(code, cursorPosition, language, (suggestion) => {
                    if (suggestion && editorRef.current) {
                        setAiSuggestion(suggestion);
                        
                        // Show suggestion as inline decoration
                        const pos = editorRef.current.getPosition();
                        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
                            {
                                range: new monacoRef.current.Range(
                                    pos.lineNumber,
                                    pos.column,
                                    pos.lineNumber,
                                    pos.column
                                ),
                                options: {
                                    after: {
                                        content: suggestion,
                                        inlineClassName: 'ai-suggestion-ghost-monaco'
                                    }
                                }
                            }
                        ]);
                    }
                });
            }
        });

        // Track cursor position for typing indication
        editor.onDidChangeModelContent(() => {
            if (!socketRef.current || !username) return;

            const now = Date.now();
            if (now - lastCursorEmitRef.current < 100) return;
            lastCursorEmitRef.current = now;

            const position = editor.getPosition();
            socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
                roomId,
                username,
                cursor: { line: position.lineNumber - 1, ch: position.column - 1 },
                color: userColor.current
            });
        });

        // Handle Tab for AI suggestion acceptance
        editor.addCommand(monaco.KeyCode.Tab, () => {
            const currentSuggestion = aiSuggestionRef.current;
            if (currentSuggestion) {
                const position = editor.getPosition();
                editor.executeEdits('ai-suggestion', [{
                    range: new monaco.Range(
                        position.lineNumber,
                        position.column,
                        position.lineNumber,
                        position.column
                    ),
                    text: currentSuggestion
                }]);
                setAiSuggestion(null);
                decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
            } else {
                // Default tab behavior (insert spaces/tab)
                editor.trigger('keyboard', 'tab', {});
            }
        });

        // Handle Escape to dismiss suggestion
        editor.addCommand(monaco.KeyCode.Escape, () => {
            setAiSuggestion(null);
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        });
    };

    // Handle remote code changes
    useEffect(() => {
        if (!socketRef.current) return;

        const codeHandler = ({ code }) => {
            if (code !== null && editorRef.current) {
                isRemoteChange.current = true;
                const currentPosition = editorRef.current.getPosition();
                editorRef.current.setValue(code);
                if (currentPosition) {
                    editorRef.current.setPosition(currentPosition);
                }
                isRemoteChange.current = false;
            }
        };

        // Handle remote cursor positions
        const cursorHandler = ({ username: remoteUsername, cursor, color, socketId }) => {
            if (!editorRef.current || !monacoRef.current || !cursor) return;

            // Remove old decoration for this user
            if (remoteCursorsRef.current[socketId]) {
                editorRef.current.deltaDecorations(remoteCursorsRef.current[socketId], []);
            }

            // Create cursor decoration
            const decorations = editorRef.current.deltaDecorations([], [
                {
                    range: new monacoRef.current.Range(
                        cursor.line + 1,
                        cursor.ch + 1,
                        cursor.line + 1,
                        cursor.ch + 2
                    ),
                    options: {
                        className: 'remote-cursor-decoration',
                        beforeContentClassName: 'remote-cursor-before',
                        hoverMessage: { value: remoteUsername },
                        stickiness: 1
                    }
                }
            ]);

            remoteCursorsRef.current[socketId] = decorations;

            // Add custom style for this user's cursor color
            const styleId = `cursor-style-${socketId}`;
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                .remote-cursor-decoration { background-color: ${color}40; }
                .remote-cursor-before { 
                    border-left: 2px solid ${color}; 
                    margin-left: -1px;
                }
            `;

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (remoteCursorsRef.current[socketId] === decorations) {
                    editorRef.current?.deltaDecorations(decorations, []);
                    delete remoteCursorsRef.current[socketId];
                }
            }, 5000);
        };

        socketRef.current.on(ACTIONS.CODE_CHANGE, codeHandler);
        socketRef.current.on(ACTIONS.CURSOR_POSITION, cursorHandler);

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, codeHandler);
            socketRef.current.off(ACTIONS.CURSOR_POSITION, cursorHandler);
        };
    }, [socketRef.current]);

    // Set initial code when loaded
    useEffect(() => {
        if (initialCode && editorRef.current) {
            const currentCode = editorRef.current.getValue();
            if (!currentCode || currentCode.trim() === '') {
                editorRef.current.setValue(initialCode);
            }
        }
    }, [initialCode]);

    // Cleanup
    useEffect(() => {
        return () => {
            cancelPendingSuggestion();
        };
    }, []);

    return (
        <div className="editorContainer" style={{ height: '100%', width: '100%' }}>
            <MonacoEditor
                height="100%"
                language={LANGUAGE_MAP[language] || 'javascript'}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    bracketPairColorization: { enabled: true },
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: { top: 14, bottom: 14 },
                    lineDecorationsWidth: 10,
                    folding: true,
                    glyphMargin: false,
                    renderLineHighlight: 'all',
                    renderLineHighlightOnlyWhenFocus: false,
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    );
};

export default Editor;
