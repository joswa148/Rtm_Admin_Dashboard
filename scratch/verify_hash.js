const bcrypt = require('bcryptjs');
const password = 'admin_rtm_2024';
const hash = '$2b$10$EPZ9S.l4Yv4S1v5V4V5V4OuFqB6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y';

bcrypt.compare(password, hash).then(match => {
    console.log('Match:', match);
});

bcrypt.hash(password, 10).then(newHash => {
    console.log('Correct hash for admin_rtm_2024:', newHash);
});
