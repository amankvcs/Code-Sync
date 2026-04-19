export const preferredEditorLanguages = [
    "Javascript",
    "Python",
    "Java",
    "C",
    "C++",
]

const editorLanguageAliases = {
    js: "Javascript",
    javascript: "Javascript",
    python: "Python",
    py: "Python",
    java: "Java",
    c: "C",
    cpp: "C++",
    "c++": "C++",
    cc: "C++",
    cxx: "C++",
}

const editorLanguageKeys = {
    Javascript: "js",
    Python: "py",
    Java: "java",
    C: "c",
    "C++": "cpp",
}

export function normalizeEditorLanguage(language) {
    if (!language) return ""

    const value = String(language).trim()
    const normalized = editorLanguageAliases[value.toLowerCase()]

    return normalized ?? value
}

export function getEditorLanguageKey(language) {
    const normalized = normalizeEditorLanguage(language)

    return editorLanguageKeys[normalized] ?? normalized.toLowerCase()
}

export function getEditorLanguageOptions(currentLanguage) {
    const normalizedCurrentLanguage =
        normalizeEditorLanguage(currentLanguage)

    if (
        !normalizedCurrentLanguage ||
        preferredEditorLanguages.includes(normalizedCurrentLanguage)
    ) {
        return preferredEditorLanguages
    }

    return [
        ...preferredEditorLanguages,
        normalizedCurrentLanguage,
    ]
}
