const database = require('./database');

async function testPhoneQuery() {
    try {
        await database.connect();
        
        // Testando com diferentes formatos de número
        const phones = [
            '558591321752',  // Formato WhatsApp sem 9
            '85991321752',   // Formato sem DDD
            '(85) 9 9132-1752', // Formato completo
            '+558591321752'  // Formato WhatsApp com +
        ];
        
        for (const phone of phones) {
            console.log(`\nTestando número: ${phone}`);
            const result = await database.getUserByPhone(phone);
            console.log('Resultado da consulta:', result);
        }
        
        await database.close();
    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

testPhoneQuery(); 