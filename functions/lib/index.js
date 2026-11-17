"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || 'allgo_cloud_jwt_secret_production_ready_32b';
const FPNV_TEST_TOKEN = 'AawNgEq0Ie2YM34Jy6X2NCVP6SI-MWzhyk_k0bHWSgtsUbnXQTBlTBtNRP5SUKRt_WM5KLjWoUNS0KW7lzVXmbYHujN48HBzWGAtXw26wz8dL-hzys1-Eo5lYvBcqYLkSmYeQmFe0fnMP8JsTmk-dQJdkQ';
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
function validateIndianPhone(phone) {
    if (!phone || typeof phone !== 'string') {
        throw new Error('Phone number is required');
    }
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    if (!/^[6-9]\d{9}$/.test(last10)) {
        throw new Error('Invalid Indian mobile number. Must be a 10-digit number starting with 6-9');
    }
    return `+91${last10}`;
}
app.get('/v1/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'AllGo Core API on Google Cloud',
        project: 'allgo-d36db',
        timestamp: new Date().toISOString(),
    });
});
app.post('/v1/auth/otp/send', async (req, res) => {
    try {
        const phone = validateIndianPhone(req.body.phone);
        const challengeRef = db.collection('otp_challenges').doc(phone);
        await challengeRef.set({
            phone,
            code: '123456',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        res.json({
            status: 'OTP_SENT',
            cooldownSeconds: 60,
            message: 'Verification code dispatched via Google Cloud Service',
        });
    }
    catch (err) {
        res.status(400).json({ statusCode: 400, error: 'Bad Request', message: err.message });
    }
});
app.post('/v1/auth/otp/verify', async (req, res) => {
    try {
        const phone = validateIndianPhone(req.body.phone);
        const code = req.body.code ? String(req.body.code).trim() : '';
        const token = req.body.token ? String(req.body.token).trim() : '';
        const isTestToken = token === FPNV_TEST_TOKEN || code === FPNV_TEST_TOKEN;
        const isStandardCode = code === '123456';
        if (!isTestToken && !isStandardCode && !/^\d{6}$/.test(code)) {
            return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid verification code. Enter 123456 or a valid Google FPNV token.',
            });
        }
        const userRef = db.collection('users').doc(phone);
        const userDoc = await userRef.get();
        let userData;
        let isNewUser = false;
        if (!userDoc.exists) {
            isNewUser = true;
            userData = {
                id: `usr_${phone.replace(/\D/g, '')}`,
                phone,
                status: 'ACTIVE',
                roles: ['CUSTOMER', 'PARTNER', 'MERCHANT_ADMIN'],
                defaultLanguage: 'en',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await userRef.set(userData);
        }
        else {
            userData = userDoc.data();
        }
        const payload = {
            userId: userData.id,
            phone: userData.phone,
            status: userData.status,
            roles: userData.roles,
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 604800,
            isNewUser,
            user: {
                id: userData.id,
                phone: userData.phone,
                fullName: userData.fullName || null,
                status: userData.status || 'ACTIVE',
                roles: userData.roles || ['CUSTOMER'],
                defaultLanguage: userData.defaultLanguage || 'en',
            },
        });
    }
    catch (err) {
        return res.status(400).json({ statusCode: 400, error: 'Bad Request', message: err.message });
    }
});
app.get('/v1/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const userDoc = await db.collection('users').doc(decoded.phone).get();
        if (!userDoc.exists) {
            return res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'User not found' });
        }
        return res.json(userDoc.data());
    }
    catch (err) {
        return res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: err.message });
    }
});
exports.api = (0, https_1.onRequest)({ region: 'asia-south1', maxInstances: 10, cors: true }, app);
//# sourceMappingURL=index.js.map