const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/apiError');

module.exports = function(app) {
    // Get list of US states
    app.get("/api/utils/states", (req, res, next) => {
        try {
            const statesPath = path.join(__dirname, '..', 'utils', 'states.json');
            const statesData = fs.readFileSync(statesPath, 'utf8');
            const states = JSON.parse(statesData);
            res.status(200).json(states);
        } catch (err) {
            next(ApiError.internal('Failed to load states'));
        }
    });

    // Get list of countries
    app.get("/api/utils/countries", (req, res, next) => {
        try {
            const countriesPath = path.join(__dirname, '..', 'utils', 'countries.json');
            const countriesData = fs.readFileSync(countriesPath, 'utf8');
            const countries = JSON.parse(countriesData);
            res.status(200).json(countries);
        } catch (err) {
            next(ApiError.internal('Failed to load countries'));
        }
    });
};
