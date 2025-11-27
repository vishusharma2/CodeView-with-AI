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

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    const textareaRef = useRef(null);
    const [language, setLanguage] = useState('javascript');

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
        });

        // Cleanup function to destroy editor instance
        return () => {
            if (editorRef.current) {
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
