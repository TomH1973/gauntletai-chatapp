"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var alice, bob, carol, dave, apiThread, timelineThread;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: 'alice@example.com',
                            name: 'Alice Johnson',
                            systemRole: client_1.SystemRole.MEMBER,
                            clerkId: 'user_alice',
                            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
                        }
                    })];
                case 1:
                    alice = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'bob@example.com',
                                name: 'Bob Smith',
                                systemRole: client_1.SystemRole.MEMBER,
                                clerkId: 'user_bob',
                                image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
                            }
                        })];
                case 2:
                    bob = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'carol@example.com',
                                name: 'Carol Williams',
                                systemRole: client_1.SystemRole.MEMBER,
                                clerkId: 'user_carol',
                                image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol'
                            }
                        })];
                case 3:
                    carol = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'dave@example.com',
                                name: 'Dave Brown',
                                systemRole: client_1.SystemRole.MEMBER,
                                clerkId: 'user_dave',
                                image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave'
                            }
                        })];
                case 4:
                    dave = _a.sent();
                    return [4 /*yield*/, prisma.thread.create({
                            data: {
                                name: 'API Endpoints Discussion',
                                participants: {
                                    create: [
                                        { userId: alice.id, role: client_1.ParticipantRole.OWNER },
                                        { userId: bob.id, role: client_1.ParticipantRole.MEMBER },
                                        { userId: carol.id, role: client_1.ParticipantRole.MEMBER }
                                    ]
                                }
                            }
                        })];
                case 5:
                    apiThread = _a.sent();
                    // Add messages to API thread
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'What authentication method should we use for the API endpoints?',
                                threadId: apiThread.id,
                                userId: alice.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 6:
                    // Add messages to API thread
                    _a.sent();
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'I suggest we use JWT tokens with short expiration times.',
                                threadId: apiThread.id,
                                userId: bob.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'Good idea. We should also implement refresh tokens and rate limiting.',
                                threadId: apiThread.id,
                                userId: carol.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.thread.create({
                            data: {
                                name: 'Project Timeline',
                                participants: {
                                    create: [
                                        { userId: dave.id, role: client_1.ParticipantRole.OWNER },
                                        { userId: alice.id, role: client_1.ParticipantRole.MEMBER },
                                        { userId: bob.id, role: client_1.ParticipantRole.MEMBER }
                                    ]
                                }
                            }
                        })];
                case 9:
                    timelineThread = _a.sent();
                    // Add messages to timeline thread
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'Here\'s the proposed timeline for the next phase.',
                                threadId: timelineThread.id,
                                userId: dave.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 10:
                    // Add messages to timeline thread
                    _a.sent();
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'The backend tasks look good, but we might need more time for testing.',
                                threadId: timelineThread.id,
                                userId: alice.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: 'Agreed. Let\'s add an extra week for QA and security testing.',
                                threadId: timelineThread.id,
                                userId: bob.id,
                                status: client_1.MessageStatus.SENT
                            }
                        })];
                case 12:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
