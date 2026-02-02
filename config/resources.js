// Big list of resources fed into the model for relevance checks and reflection pointers.
// Categories are used in a two-step flow: (1) relevance check (2) reflection with only relevant resources.

module.exports = {
    categories: {
        crisis: {
            label: 'Crisis / mental health',
            oneLiner: 'Immediate support for crisis, self-harm, or severe distress.',
            items: [
                { name: '988 Suicide & Crisis Lifeline', url: 'https://988lifeline.org', text: 'Call or text 988 (US & Canada)' },
                { name: 'National Alliance on Mental Illness (NAMI)', url: 'https://www.nami.org', text: 'nami.org' },
                { name: 'Psychology Today Therapist Finder', url: 'https://www.psychologytoday.com/us/therapists', text: 'psychologytoday.com/us/therapists' }
            ]
        },
        loneliness: {
            label: 'Connection / loneliness',
            oneLiner: 'Support for loneliness or desire to connect with others.',
            items: [
                { name: 'Meetup', url: 'https://www.meetup.com', text: 'Local and online groups by interest (meetup.com)' },
                { name: 'NAMI support groups', url: 'https://www.nami.org/Support-Education/Support-Groups', text: 'NAMI support groups' }
            ]
        },
        wellbeing: {
            label: 'Interests / wellbeing',
            oneLiner: 'Hobbies, fitness, art, books, coding, nature, general wellbeing.',
            items: [
                { name: 'Local libraries', text: 'Libraries often have events, book clubs, and community programs' },
                { name: 'Tech meetups', text: "Search 'tech meetups' or 'coding meetups' + your city" },
                { name: 'Fitness and activity groups', text: 'Online forums or local groups for your chosen activity' }
            ]
        }
    },

    // Returns a compact string of category keys and one-liners for the relevance prompt.
    getCompactList() {
        const lines = [];
        for (const [key, cat] of Object.entries(this.categories)) {
            lines.push(`${key}: ${cat.oneLiner}`);
        }
        return lines.join('\n');
    },

    // Returns formatted text for a set of category keys (for injection into reflection prompt).
    getResourcesTextForCategories(categoryKeys) {
        if (!categoryKeys || categoryKeys.length === 0) return '';
        const parts = [];
        for (const key of categoryKeys) {
            const cat = this.categories[key];
            if (!cat) continue;
            parts.push(`--- ${cat.label} ---`);
            for (const item of cat.items) {
                parts.push(item.url ? `* ${item.name}: ${item.url} (${item.text})` : `* ${item.name}: ${item.text}`);
            }
            parts.push('---');
        }
        return parts.join('\n');
    }
};
