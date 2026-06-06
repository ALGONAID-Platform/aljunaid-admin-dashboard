import axios from 'axios';

const run = async () => {
    try {
        const { data: regData } = await axios.post('http://localhost:3000/api/v1/auth/signup', {
            email: 'admin2@junaid.edu',
            password: 'Password123!',
            name: 'Admin User',
            role: 'ADMIN'
        });
        console.log("Registered:", regData);
    } catch (e) {
        console.log("Register Error:", e.response?.data || e.message);
    }

    try {
        const { data } = await axios.post('http://localhost:3000/api/v1/auth/signin', {
            email: 'admin2@junaid.edu',
            password: 'Password123!'
        });
        console.log("Login Success:", data);
    } catch (e) {
        console.log("Login Error:", e.response?.data || e.message);
    }
};

run();
