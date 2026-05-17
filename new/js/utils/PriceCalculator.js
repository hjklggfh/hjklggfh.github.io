const PriceCalculator = {
    qualityMultipliers: { '凡品': 1, '灵品': 3, '仙品': 10 },

    buyPrice(item) {
        return Math.floor(item.price * this.qualityMultipliers[item.quality]);
    },

    sellPrice(item) {
        return Math.floor(this.buyPrice(item) * 0.5);
    }
};
