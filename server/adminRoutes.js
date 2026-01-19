module.exports = function(app, User) {

    // Get all users
    app.route("/api/admin/users")
        .get(async (req, res) => {
            try {
                const users = await User.find({}, { password: 0 });
                
                const usersArray = users.map(user => ({
                    id: user._id,
                    fname: user.fname || '',
                    lname: user.lname || '',
                    uname: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    type: user.type || 'student'
                }));

                res.status(200).json(usersArray);
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    // Get user by ID
    app.route("/api/admin/user/:id")
        .get(async (req, res) => {
            try {
                const userId = req.params.id;
                
                const user = await User.findById(userId, { password: 0 });
                
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userObj = {
                    id: user._id,
                    fname: user.fname || '',
                    lname: user.lname || '',
                    uname: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    type: user.type || 'student'
                };

                res.status(200).json(userObj);
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    // Update user
    app.route("/api/admin/user/:id")
        .put(async (req, res) => {
            try {
                const userId = req.params.id;
                const { fname, lname, email, phone, uname, type } = req.body || {};

                // Validation
                const validationErrors = [];
                
                if (uname && (typeof uname !== 'string' || uname.trim().length < 3)) {
                    validationErrors.push('username must be at least 3 characters');
                } else if (uname && !/^[A-Za-z0-9]+$/.test(uname)) {
                    validationErrors.push('username may contain only letters and numbers');
                }

                if (fname && (typeof fname !== 'string' || fname.trim().length < 2)) {
                    validationErrors.push('first name must be at least 2 characters');
                }

                if (lname && (typeof lname !== 'string' || lname.trim().length < 2)) {
                    validationErrors.push('last name must be at least 2 characters');
                }

                if (email && (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email))) {
                    validationErrors.push('invalid email address');
                }

                if (phone && (typeof phone !== 'string' || !/^[\d\s\-\+\(\)]{10,}$/.test(phone))) {
                    validationErrors.push('phone number must be at least 10 digits');
                }

                if (type && !['student', 'admin'].includes(type)) {
                    validationErrors.push('type must be either student or admin');
                }

                if (validationErrors.length) {
                    return res.status(400).json({ errors: validationErrors });
                }

                // Check if username is taken by another user
                if (uname) {
                    const existingUser = await User.findOne({ username: uname, _id: { $ne: userId } });
                    if (existingUser) {
                        return res.status(409).json({ error: 'username already in use' });
                    }
                }

                // Update user
                const updateData = {};
                if (fname !== undefined) updateData.fname = fname;
                if (lname !== undefined) updateData.lname = lname;
                if (email !== undefined) updateData.email = email;
                if (phone !== undefined) updateData.phone = phone;
                if (uname !== undefined) updateData.username = uname;
                if (type !== undefined) updateData.type = type;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    updateData,
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userObj = {
                    id: updatedUser._id,
                    fname: updatedUser.fname || '',
                    lname: updatedUser.lname || '',
                    uname: updatedUser.username,
                    email: updatedUser.email || '',
                    phone: updatedUser.phone || '',
                    type: updatedUser.type || 'student'
                };

                res.status(200).json(userObj);
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    // Delete user
    app.route("/api/admin/user/:id")
        .delete(async (req, res) => {
            try {
                const userId = req.params.id;
                
                const deletedUser = await User.findByIdAndDelete(userId);
                
                if (!deletedUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.status(200).json({ message: 'User deleted successfully', id: userId });
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    // Update user type (promote/demote admin)
    app.route("/api/admin/user/:id/type")
        .patch(async (req, res) => {
            try {
                const userId = req.params.id;
                const { type } = req.body || {};

                if (!type || !['student', 'admin'].includes(type)) {
                    return res.status(400).json({ error: 'Invalid user type. Must be student or admin' });
                }

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { type: type },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userObj = {
                    id: updatedUser._id,
                    fname: updatedUser.fname || '',
                    lname: updatedUser.lname || '',
                    uname: updatedUser.username,
                    email: updatedUser.email || '',
                    phone: updatedUser.phone || '',
                    type: updatedUser.type || 'student'
                };

                res.status(200).json(userObj);
            } catch (err) {
                console.log('err: ' + err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

};
