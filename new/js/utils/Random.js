const RandomUtils = {
    weightedRandom(items, weightKey) {
        const total = items.reduce((s, i) => s + (i[weightKey] || 1), 0);
        let r = Math.random() * total;
        for (const item of items) {
            r -= (item[weightKey] || 1);
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    },

    intBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    floatBetween(min, max) {
        return Math.random() * (max - min) + min;
    },

    chance(probability) {
        return Math.random() < probability;
    },

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
};
