import React, { useEffect, useRef, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ACTIONS from '../Actions';
import { debouncedGetAISuggestion, cancelPendingSuggestion } from '../services/aiService';
import { useTheme } from '../context/ThemeContext';

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

// Language-specific completion providers
const languageKeywords = {
    python: {
        keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'lambda', 'pass', 'break', 'continue', 'raise', 'assert', 'global', 'nonlocal', 'del', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
        builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'input', 'open', 'file', 'abs', 'all', 'any', 'bin', 'chr', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'format', 'getattr', 'hasattr', 'hash', 'hex', 'id', 'isinstance', 'issubclass', 'iter', 'map', 'max', 'min', 'next', 'oct', 'ord', 'pow', 'repr', 'reversed', 'round', 'setattr', 'slice', 'sorted', 'sum', 'super', 'vars', 'zip', '__init__', '__str__', '__repr__', '__len__', '__getitem__', '__setitem__']
    },
    java: {
        keywords: ['public', 'private', 'main', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'new', 'this', 'super', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'String', 'null', 'true', 'false', 'import', 'package'],
        builtins: ['System.out.println', 'System.out.print', 'String.valueOf', 'Integer.parseInt', 'Double.parseDouble', 'Arrays.sort', 'Arrays.toString', 'Collections.sort', 'Math.max', 'Math.min', 'Math.abs', 'Math.sqrt', 'Math.pow', 'Math.random']
    },
    cpp: {
        keywords: ['int', 'long', 'double', 'float', 'char', 'bool', 'void', 'auto', 'const', 'static', 'extern', 'class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'new', 'delete', 'this', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'throw', 'namespace', 'using', 'include', 'define', 'template', 'typename', 'nullptr', 'true', 'false'],
        builtins: ['cout', 'cin', 'endl', 'vector', 'string', 'map', 'set', 'pair', 'queue', 'stack', 'priority_queue', 'sort', 'find', 'push_back', 'pop_back', 'begin', 'end', 'size', 'empty', 'clear']
    },
    go: {
        keywords: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'return', 'go', 'defer', 'select', 'fallthrough', 'nil', 'true', 'false', 'iota'],
        builtins: ['fmt.Println', 'fmt.Printf', 'fmt.Sprintf', 'len', 'cap', 'make', 'new', 'append', 'copy', 'delete', 'panic', 'recover', 'close', 'string', 'int', 'int64', 'float64', 'bool', 'error']
    },
    ruby: {
        keywords: ['def', 'end', 'class', 'module', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'do', 'begin', 'rescue', 'ensure', 'raise', 'return', 'yield', 'self', 'super', 'nil', 'true', 'false', 'and', 'or', 'not', 'require', 'include', 'extend', 'attr_accessor', 'attr_reader', 'attr_writer', 'private', 'public', 'protected'],
        builtins: ['puts', 'print', 'gets', 'chomp', 'to_s', 'to_i', 'to_f', 'to_a', 'to_h', 'length', 'size', 'each', 'map', 'select', 'reject', 'reduce', 'find', 'sort', 'reverse', 'join', 'split', 'push', 'pop', 'shift', 'unshift']
    },
    php: {
        keywords: ['function', 'class', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'extends', 'implements', 'new', 'this', 'self', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'namespace', 'use', 'require', 'include', 'echo', 'print', 'true', 'false', 'null', 'array'],
        builtins: ['echo', 'print', 'print_r', 'var_dump', 'strlen', 'strpos', 'substr', 'str_replace', 'explode', 'implode', 'array_push', 'array_pop', 'array_map', 'array_filter', 'array_merge', 'count', 'isset', 'empty', 'json_encode', 'json_decode']
    },
    rust: {
        keywords: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'pub', 'mod', 'use', 'self', 'super', 'crate', 'if', 'else', 'match', 'loop', 'while', 'for', 'in', 'break', 'continue', 'return', 'async', 'await', 'move', 'ref', 'where', 'type', 'unsafe', 'true', 'false'],
        builtins: ['println!', 'print!', 'format!', 'vec!', 'String::new', 'String::from', 'Vec::new', 'Option', 'Some', 'None', 'Result', 'Ok', 'Err', 'unwrap', 'expect', 'clone', 'iter', 'map', 'filter', 'collect', 'len', 'push', 'pop']
    }
};

let completionProvidersRegistered = false;

const registerLanguageCompletions = (monaco) => {
    if (completionProvidersRegistered) return;
    completionProvidersRegistered = true;

    Object.entries(languageKeywords).forEach(([lang, { keywords, builtins }]) => {
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = [
                    ...keywords.map(kw => ({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        range
                    })),
                    ...builtins.map(fn => ({
                        label: fn,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: fn.includes('(') ? fn : fn + (fn.includes('.') || fn.includes('!') ? '' : '()'),
                        range
                    }))
                ];

                return { suggestions };
            }
        });
    });
};

const Editor = ({ socketRef, roomId, onCodeChange, initialCode, username, language = 'javascript', fileName }) => {
    const { theme } = useTheme();
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const aiSuggestionRef = useRef(null); // Ref to track current suggestion
    const decorationsRef = useRef([]);
    const remoteCursorsRef = useRef({});
    const lastCursorEmitRef = useRef(0);
    const userColor = useRef(generateUserColor(username || 'user'));
    const isRemoteChange = useRef(false);
    const fileNameRef = useRef(fileName);

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

    // Update fileNameRef when fileName prop changes
    useEffect(() => {
        fileNameRef.current = fileName;
    }, [fileName]);

    // Handle editor mount
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        // Register language-specific completions
        registerLanguageCompletions(monaco);
        
        // Focus editor
        editor.focus();

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
            if (socketRef.current && fileNameRef.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                    fileName: fileNameRef.current,
                });
            }

            // Clear AI suggestion on user input
            setAiSuggestion(null);
            try {
                editor.removeContentWidget({ getId: () => 'ghost.text.widget' });
            } catch (e) {}
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

            // Trigger AI suggestion (debounced)
            if (code.trim().length > 0) {
                const position = editor.getPosition();
                const cursorPosition = editor.getModel().getOffsetAt(position);
                
                debouncedGetAISuggestion(code, cursorPosition, language, (suggestion) => {
                    if (suggestion && editorRef.current) {
                        console.log('✅ AI Suggestion received:', suggestion);
                        
                        // Get current line content up to cursor
                        const model = editorRef.current.getModel();
                        const currentPosition = editorRef.current.getPosition();
                        const lineContent = model.getLineContent(currentPosition.lineNumber);
                        // Get content from start of line to cursor
                        const linePrefix = lineContent.substring(0, currentPosition.column - 1);
                        
                        // Check if suggestion starts with what we already typed
                        let displayText = suggestion;
                        
                        // If suggestion starts with the line prefix, strip it
                        if (suggestion.startsWith(linePrefix)) {
                            displayText = suggestion.substring(linePrefix.length);
                        } else if (suggestion.startsWith(lineContent.trim())) {
                             displayText = suggestion.substring(lineContent.trim().length);
                        }

                        // Don't show if there's nothing new to add
                        if (!displayText || displayText.trim().length === 0) {
                             return;
                        }

                        setAiSuggestion(suggestion); // Keep full suggestion for Tab completion
                        const pos = editorRef.current.getPosition();
                        
                        // Extract first line only for inline display
                        const firstLine = displayText.split('\n')[0];
                        const widgetText = firstLine + (displayText.includes('\n') ? ' ...' : '');
                        
                        // Create a ghost text widget for better visibility
                        const ghostTextWidget = {
                            getId: () => 'ghost.text.widget',
                            getDomNode: () => {
                                const node = document.createElement('div');
                                node.className = 'ghost-text-widget';
                                node.style.cssText = `
                                    color: #6c7a89;
                                    font-style: italic;
                                    opacity: 0.7;
                                    pointer-events: none;
                                    white-space: pre;
                                    font-family: inherit;
                                `;
                                node.textContent = widgetText;
                                return node;
                            },
                            getPosition: () => ({
                                position: pos,
                                preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
                            })
                        };
                        
                        // Remove old widget if exists
                        try {
                            editorRef.current.removeContentWidget({ getId: () => 'ghost.text.widget' });
                        } catch (e) {}
                        
                        // Add new widget
                        editorRef.current.addContentWidget(ghostTextWidget);
                        
                        console.log('🎨 Ghost text widget created (first line only)');
                        console.log('🎨 Display text:', widgetText);
                    } else {
                        console.log('❌ No suggestion received or editor not ready');
                    }
                });
            }
        });

        // Track cursor position (typing + movement)
        const emitCursorPosition = () => {
            if (!socketRef.current || !username) return;

            const now = Date.now();
            if (now - lastCursorEmitRef.current < 50) return; // Reduce throttle for smoother movement
            lastCursorEmitRef.current = now;

            const position = editor.getPosition();
            socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
                roomId,
                username,
                cursor: { line: position.lineNumber - 1, ch: position.column - 1 },
                color: generateUserColor(username),
                fileName: fileNameRef.current
            });
        };

        editor.onDidChangeModelContent(emitCursorPosition);
        editor.onDidChangeCursorPosition(emitCursorPosition);

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
            try {
                editor.removeContentWidget({ getId: () => 'ghost.text.widget' });
            } catch (e) {}
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        });
    };

    // Handle remote code changes
    useEffect(() => {
        if (!socketRef.current) return;

        const codeHandler = ({ code, fileName: incomingFileName }) => {
            // Only update if this is the same file
            if (code !== null && editorRef.current && incomingFileName === fileName) {
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
        const cursorHandler = ({ username: remoteUsername, cursor, color, socketId, fileName: incomingFileName }) => {
            if (!editorRef.current || !monacoRef.current || !cursor) return;

            // Only show cursor if it's on the same file
            if (incomingFileName !== undefined && incomingFileName !== fileName) {
                // If cursor is for another file, remove it if it exists
                if (remoteCursorsRef.current[socketId]) {
                    editorRef.current.deltaDecorations(remoteCursorsRef.current[socketId], []);
                    delete remoteCursorsRef.current[socketId];
                }
                return;
            }

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
    }, [socketRef.current, fileName]);

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
                theme={theme === 'light' ? 'light' : 'vs-dark'}
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
                    // IntelliSense / Autocomplete
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true
                    },
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    wordBasedSuggestions: 'currentDocument',
                    suggestSelection: 'first',
                    parameterHints: { enabled: true },
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    );
};

export default Editor;
