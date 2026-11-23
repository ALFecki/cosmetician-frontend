export function trimArticleText(text: string): string {
    return text.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

export function articleParagraphs(body: string): string[] {
    return body
        .split(/\r\n?|\n/)
        .map(trimArticleText)
        .filter(Boolean);
}

export function splitArticleText(body: string, positions: readonly number[]): string[] {
    const ends = [0];
    for (const line of body.matchAll(/[^\r\n]*(?:\r\n?|\n|$)/g)) {
        if (trimArticleText(line[0])) ends.push(line.index + line[0].length);
    }

    let start = 0;
    const sections = positions.map(position => {
        const end = Math.max(start, ends[position] ?? body.length);
        const section = body.slice(start, end);
        start = end;
        return section;
    });
    sections.push(body.slice(start));
    return sections;
}

export function joinArticleText(before: string, after: string): string {
    const separator = before && after && !/[\r\n]$/.test(before) && !/^[\r\n]/.test(after) ? '\n' : '';
    return before + separator + after;
}
