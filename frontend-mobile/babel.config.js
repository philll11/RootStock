module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Required for WatermelonDB Models
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            // Required for Reanimated
            'react-native-reanimated/plugin',
        ],
    };
};