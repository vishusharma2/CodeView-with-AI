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

const Editor = ({ socketRef, roomId, onCodeChange, onLanguageChange }) => {
    const editorRef = useRef(null);
    const textareaRef = useRef(null);
    const [language, setLanguage] = useState('javascript');
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const suggestionWidgetRef = useRef(null);

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

        const languageHandler = ({ language: newLanguage }) => {
            setLanguage(newLanguage);
            if (editorRef.current) {
                editorRef.current.setOption('mode', LANGUAGE_MODES[newLanguage]);
            }
        };

        socketRef.current.on(ACTIONS.CODE_CHANGE, codeHandler);
        socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, languageHandler);

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, codeHandler);
            socketRef.current.off(ACTIONS.LANGUAGE_CHANGE, languageHandler);
        };

    }, [socketRef.current]);

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

    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);
        
        if (editorRef.current) {
            editorRef.current.setOption('mode', LANGUAGE_MODES[newLanguage]);
        }

        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
                roomId,
                language: newLanguage,
            });
        }

        // Notify parent component of language change
        if (onLanguageChange) {
            onLanguageChange(newLanguage);
        }
    };

    return (
        <div className="editorContainer">
            <div className="editorToolbar">
                <div className="toolbarLeft">
                    <span className="editorTitle">Code Editor</span>
                </div>
                <div className="toolbarRight">
                    <label htmlFor="language-select" className="languageLabel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        Language:
                    </label>
                    <select 
                        id="language-select"
                        value={language} 
                        onChange={handleLanguageChange}
                        className="languageSelector"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                        <option value="ruby">Ruby</option>
                        <option value="php">PHP</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                    </select>
                </div>
            </div>
            <textarea ref={textareaRef}></textarea>
        </div>
    );
};

export default Editor;
