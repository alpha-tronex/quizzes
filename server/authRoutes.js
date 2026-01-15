const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function(app, User) {

    app.route("/api/register")
        .post(async (req, res) => {
            try {
                const { fname, lname, uname, email, pass, phone } = req.body || {};

                // basic validation
                const validationErrors = [];
                
                if (!fname || typeof fname !== 'string' || fname.trim().length < 2) {
                    validationErrors.push('first name must be at least 2 characters');
                }

                if (!lname || typeof lname !== 'string' || lname.trim().length < 2) {
                    validationErrors.push('last name must be at least 2 characters');
                }

                if (!uname || typeof uname !== 'string' || uname.trim().length < 3) {
                    validationErrors.push('username must be at least 3 characters');
                } else if (!/^[A-Za-z0-9]+$/.test(uname)) {
                    validationErrors.push('username may contain only letters and numbers');
                }

                if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
                    validationErrors.push('invalid email address');
                }

                if (!phone || typeof phone !== 'string' || !/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
                    validationErrors.push('phone number must be at least 10 digits');
                }

                if (!pass || typeof pass !== 'string' || pass.length < 6) {
                    validationErrors.push('password must be at least 6 characters');
                }

                if (validationErrors.length) {
                    return res.status(400).json({ errors: validationErrors });
                }

                // ensure username/email uniqueness
                const existing = await User.findOne({ $or: [{ username: uname }, { email: email }] });
                if (existing) {
                    return res.status(409).json({ error: 'username or email already in use' });
                }

                const hash = await bcrypt.hash(pass, saltRounds);
                const user = new User({
                    fname: fname,
                    lname: lname,
                    username: uname,
                    email: email,
                    password: hash,
                    phone: phone,
                    type: 'student'
                });
                console.log('before save');

                await user.save();

                console.log('username: ' + user.username);
                console.log('email: ' + user.email);

                console.log('after save');
                const userObj = {
                    id: user._id,
                    fname: user.fname,
                    lname: user.lname,
                    uname: user.username,
                    email: user.email,
                    phone: user.phone,
                    pass: '', // Don't send the hashed password
                    confirmPass: '',
                    type: user.type
                };
                res.status(200).json(userObj);

            } catch (err) {
                console.log('err' + err);
                res.status(500).send(err);
            }
        })

    app.route("/api/login")
        .post(async (req,res) => {
        try {
            console.log("uname: " + req.body.uname);
            console.log("pass: " + req.body.pass);
            
            const uname = req.body.uname;
            const pass = req.body.pass;

            // cannot query password field if it is encrypted
            const foundUser = await User.findOne({username: uname});
            console.log("foundUser: " + foundUser);

            if (!foundUser) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log("in if (foundUser)");
            bcrypt.compare(pass, foundUser.password, function(err, result) {
                console.log('result: ' + result);
                console.log('err: ' + err);
                if (result === true) {
                    const userObj = {
                        id: foundUser._id,
                        fname: foundUser.fname,
                        lname: foundUser.lname,
                        uname: foundUser.username,
                        email: foundUser.email,
                        phone: foundUser.phone,
                        address: foundUser.address,
                        pass: '', // Don't send the hashed password
                        confirmPass: '',
                        type: foundUser.type
                    };
                    res.status(200).json(userObj);
                    console.log("status 200 success");
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
                console.log("in crypto");
            });

        } catch (err) {
            console.log('err' + err);
            res.status(500).send(err);
        }
    });

    app.route("/api/logout")
        .get((req,res) => {
            // kill the session cookie, then
            res.redirect("/");
    });

    app.route("/api/user/update")
        .put(async (req, res) => {
            try {
                const { id, fname, lname, email, phone, address } = req.body || {};

                // Validation
                const validationErrors = [];
                
                if (!id) {
                    return res.status(400).json({ error: 'User ID is required' });
                }

                if (!fname || typeof fname !== 'string' || fname.trim().length < 2) {
                    validationErrors.push('first name must be at least 2 characters');
                }

                if (!lname || typeof lname !== 'string' || lname.trim().length < 2) {
                    validationErrors.push('last name must be at least 2 characters');
                }

                if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
                    validationErrors.push('invalid email address');
                }

                if (!phone || typeof phone !== 'string' || !/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
                    validationErrors.push('phone number must be at least 10 digits');
                }

                if (validationErrors.length) {
                    return res.status(400).json({ errors: validationErrors });
                }

                // Update user
                const updatedUser = await User.findByIdAndUpdate(
                    id,
                    {
                        fname: fname,
                        lname: lname,
                        email: email,
                        phone: phone,
                        address: address || {}
                    },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userObj = {
                    id: updatedUser._id,
                    fname: updatedUser.fname,
                    lname: updatedUser.lname,
                    uname: updatedUser.username,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    address: updatedUser.address,
                    pass: '',
                    confirmPass: '',
                    type: updatedUser.type
                };

                res.status(200).json(userObj);
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

};
