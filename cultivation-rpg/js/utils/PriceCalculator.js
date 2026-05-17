const PriceCalculator = {
    qualityMultipliers: {
        '凡品': 1,
        '良品': 1.45,
        '灵品': 3,
        '玄品': 5.5,
        '地品': 9,
        '天品': 14,
        '仙品': 24
    },

    buyPrice(item) {
        return Math.floor(item.price * (this.qualityMultipliers[item.quality] || 1));
    },

    sellPrice(item) {
        return Math.floor(this.buyPrice(item) * 0.5);
    }
};
