require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('./app');

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

// Connect to MongoDB before accepting traffic, rather than starting the
// listener immediately and racing the connection in the background.
mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB');
        const app = createApp();
        app.listen(port, () => console.log(`Server is running on port ${port}.`));
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });
