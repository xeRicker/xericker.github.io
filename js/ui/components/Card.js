export function cardClass(additionalClass = '') {
    return ['card', additionalClass].filter(Boolean).join(' ');
}

