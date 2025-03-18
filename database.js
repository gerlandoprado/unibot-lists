const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
    constructor() {
        this.connection = null;
    }

    formatPhoneNumber(phone) {
        // Remove todos os caracteres não numéricos
        const numbers = phone.replace(/\D/g, '');
        
        // Remove o prefixo 55 do Brasil se existir
        const nationalNumber = numbers.startsWith('55') ? numbers.slice(2) : numbers;
        
        // Se o número tem 10 dígitos (sem o 9), adiciona o 9
        let fullNumber = nationalNumber;
        if (nationalNumber.length === 10) {
            fullNumber = nationalNumber.slice(0, 2) + '9' + nationalNumber.slice(2);
        }
        
        // Formata o número no padrão (XX) X XXXX-XXXX
        if (fullNumber.length === 11) {
            return `(${fullNumber.slice(0,2)}) ${fullNumber.slice(2,3)} ${fullNumber.slice(3,7)}-${fullNumber.slice(7)}`;
        }
        return phone; // Retorna o número original se não conseguir formatar
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(config.database);
            console.log('Conectado ao banco de dados MySQL');
        } catch (error) {
            console.error('Erro ao conectar ao banco de dados:', error);
            throw error;
        }
    }

    async getUserByPhone(phone) {
        try {
            const formattedPhone = this.formatPhoneNumber(phone);
            console.log('Número formatado:', formattedPhone); // Log para debug
            const [rows] = await this.connection.execute(
                'SELECT display, ies FROM cadastro WHERE whatsapp = ?',
                [formattedPhone]
            );
            return rows[0] ? rows[0].display : null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('Conexão com o banco de dados fechada');
        }
    }
}

module.exports = new Database(); 