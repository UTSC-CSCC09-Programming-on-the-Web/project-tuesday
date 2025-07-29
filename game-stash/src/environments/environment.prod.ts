// Production environment configuration - to use, cd to the game-stash directory and run: ng build --configuration production

export const environment = {
    production: true,
    apiUrl: 'https://api.gamestash.live/api', // Production API URL - fixed to include /api prefix
    socketUrl: 'https://api.gamestash.live', // WebSocket/Socket.IO URL
    googleClientId: '109955516715-84v52ncokbvhrsirl8v7e83lbed5a81b.apps.googleusercontent.com',
    stripePublishableKey: 'pk_test_51RgrGg2Xvu7GA77tKbkzt2SX1wI8dXX9zR9zG0fRj4fcTab2AA5RNf7liukYzBfXNGbupkqVgTgxdAOI7LGG36u500aioW0kL5' // Update with production publishable key if needed
};
