// Development environment configuration - to use, cd to the game-stash directory and run: ng build --configuration development
// No need to update any values here during first-time setup unless you want to use your own Stripe and Google Cloud accounts

export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    googleClientId: '109955516715-84v52ncokbvhrsirl8v7e83lbed5a81b.apps.googleusercontent.com',
    stripePublishableKey: 'pk_test_51RgrGg2Xvu7GA77tKbkzt2SX1wI8dXX9zR9zG0fRj4fcTab2AA5RNf7liukYzBfXNGbupkqVgTgxdAOI7LGG36u500aioW0kL5'
};
