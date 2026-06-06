import axios from 'axios';

const testLogin = async () => {
    try {
        const { data } = await axios.post('http://localhost:3000/api/v1/auth/signin', {
            email: 'admin@junaid.edu', // Need a valid user
            password: 'any' // Password validation failed, so this will return 400
        });
        console.log("Success:", data);
    } catch (e) {
        console.log("Error:", e.response?.data);
    }
};

testLogin();
