/*
  ██████╗  █████╗  ██████╗██╗  ██╗██╗██████╗ 
  ██╔══██╗██╔══██╗██╔════╝██║  ██║██║██╔══██╗
  ██████╔╝███████║██║     ███████║██║██████╔╝
  ██╔══██╗██╔══██║██║     ██╔══██║██║██╔══██╗
  ██████╔╝██║  ██║╚██████╗██║  ██║██║██║  ██║
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
  
  ░█████╗░██████╗░███████╗░█████╗░████████╗░█████╗░██████╗░
  ██╔══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗
  ██║░░╚═╝██████╔╝█████╗░░███████║░░░██║░░░██║░░██║██████╔╝
  ██║░░██╗██╔══██╗██╔══╝░░██╔══██║░░░██║░░░██║░░██║██╔══██╗
  ╚█████╔╝██║░░██║███████╗██║░░██║░░░██║░░░╚█████╔╝██║░░██║
  ░╚════╝░╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝

  CREATOR: DEV KILLER
  BOT NAME: BACHIR MD
  VERSION: 2026
  STATUS: ACTIF
  RUNTIME: 5h
  PREFIXE: MULTI PREFIX
  NUMERO: 84566540
*/

// ==================== IMPORTS ====================
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    downloadContentFromMessage,
    getContentType,
    proto,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    generateForwardMessageContent,
    generateWAMessage,
    jidDecode
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const googleTTS = require('google-tts-api');
const sharp = require('sharp');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const moment = require('moment-timezone');
const chalk = require('chalk');
const figlet = require('figlet');
const os = require('os');
const speed = require('performance-now');
const { sizeFormatter } = require('human-readable');
const format = sizeFormatter();
const qrcode = require('qrcode-terminal');

// ==================== CONFIGURATION GLOBALE ====================
const CONFIG = {
    NOM_BOT: "BACHIR MD",
    CREATEUR: "DEV KILLER",
    NUMERO: "84566540",
    VERSION: "2026",
    PREFIXES: [".", "!", "#", "/", "&"],
    SESSION_NAME: "bachir-session",
    OWNER: ["84566540@s.whatsapp.net"],
    MODE: "public", // public ou self
    ANTI: {
        TOXIC: true,
        FOREIGN: false,
        VIRUS: true,
        STICKER: false,
        POLL: false,
        CALL: true,
        FLOOD: true,
        SPAM: true,
        VV: true,
        EDIT: true,
        DELETE: true,
        SFW: false,
        BOT: true,
        LINK: false
    },
    MUTED_USERS: new Map(),
    WARNINGS: new Map(),
    BANNED_USERS: [],
    BLOCKED_USERS: [],
    SUDO_USERS: [],
    FILTER_WORDS: new Set(),
    GROUPS_LOCKED: new Set(),
    START_TIME: Date.now(),
    MESSAGE_COUNT: new Map()
};

// ==================== STORE ====================
const store = makeInMemoryStore({ 
    logger: pino().child({ level: 'silent', stream: 'store' }) 
});

// ==================== FONCTIONS UTILITAIRES ====================

const sms = (conn, m) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id?.startsWith('BAE5') || m.id?.startsWith('3EB0');
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = m.fromMe ? conn.user.id : (m.key.participant || m.chat);
        if (m.isGroup) m.participant = m.key.participant;
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || 
                 (m.mtype == 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) || 
                 (m.mtype == 'buttonsResponseMessage' && m.msg?.selectedButtonId) || 
                 (m.mtype == 'templateButtonReplyMessage' && m.msg?.selectedId) || '';
        
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage;
        if (m.quoted) {
            if (quoted['ephemeralMessage']) quoted = quoted.ephemeralMessage.message;
            m.quoted.mtype = getContentType(quoted);
            m.quoted.msg = quoted[m.quoted.mtype];
            m.quoted.sender = m.msg.contextInfo.participant || m.chat;
        }
    }
    return m;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        console.log(`Error: ${e}`);
        return null;
    }
};

const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
        i.admin ? admins.push(i.id) : null;
    }
    return admins;
};

const getRandom = (ext = '') => {
    return `${Math.floor(Math.random() * 1000000)}${ext}`;
};

const runtime = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + "j " : "";
    var hDisplay = h > 0 ? h + "h " : "";
    var mDisplay = m > 0 ? m + "m " : "";
    var sDisplay = s > 0 ? s + "s" : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

const getTime = (format = 'DD/MM/YYYY HH:mm:ss') => {
    return moment().tz('Europe/Paris').format(format);
};

const isOwner = (sender) => {
    return CONFIG.OWNER.includes(sender) || CONFIG.SUDO_USERS.includes(sender);
};

const isAdmin = async (conn, groupId, sender) => {
    const group = await conn.groupMetadata(groupId);
    const admins = getGroupAdmins(group.participants);
    return admins.includes(sender) || group.owner === sender;
};

const isBotAdmin = async (conn, groupId) => {
    const group = await conn.groupMetadata(groupId);
    const botId = conn.user.id;
    const admins = getGroupAdmins(group.participants);
    return admins.includes(botId) || group.owner === botId;
};

const parseMention = (text) => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

const generateProfilePicture = async (buffer) => {
    const jimp = require('jimp');
    const img = await jimp.read(buffer);
    const min = img.getWidth();
    const max = img.getHeight();
    const cropped = img.crop(0, 0, min, max);
    return await cropped.scaleToFit(720, 720).getBufferAsync(jimp.MIME_JPEG);
};

// ==================== MENU COMPLET ====================
const generateMenu = (pushname, prefixes, runtimeStr) => {
    const p = prefixes[0];
    return `
╔══════════════════════════════╗
║      *${CONFIG.NOM_BOT} v${CONFIG.VERSION}*       ║
╚══════════════════════════════╝

┏━「 *ℹ️ INFO UTILISATEUR* 」
┃ 𐓷 *Nom:* ${pushname}
┃ 𐓷 *Préfixes:* [ ${prefixes.join(' , ')} ]
┃ 𐓷 *Runtime:* ${runtimeStr}
┃ 𐓷 *Statut:* 🟢 En ligne
┃ 𐓷 *Mode:* ${CONFIG.MODE.toUpperCase()}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *👑 OWNER MENU* 」
┃ ▸ ${p}setpp
┃ ▸ ${p}setprefix
┃ ▸ ${p}owner
┃ ▸ ${p}repo
┃ ▸ ${p}ban
┃ ▸ ${p}unban
┃ ▸ ${p}block
┃ ▸ ${p}unblock
┃ ▸ ${p}alive
┃ ▸ ${p}ping
┃ ▸ ${p}self
┃ ▸ ${p}public
┃ ▸ ${p}setbotpic
┃ ▸ ${p}currentpic
┃ ▸ ${p}previewpics
┃ ▸ ${p}addsudo
┃ ▸ ${p}delsudo
┃ ▸ ${p}sudolist
┃ ▸ ${p}stats
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🔗 PAIR CODE* 」
┃ ▸ ${p}connect
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *👥 GROUP MENU* 」
┃ ▸ ${p}add @user
┃ ▸ ${p}kick @user
┃ ▸ ${p}promote @user
┃ ▸ ${p}demote @user
┃ ▸ ${p}hidetag
┃ ▸ ${p}tagall
┃ ▸ ${p}tag
┃ ▸ ${p}closetime
┃ ▸ ${p}opentime
┃ ▸ ${p}grouplink
┃ ▸ ${p}resetlink
┃ ▸ ${p}listadmins
┃ ▸ ${p}listonline
┃ ▸ ${p}groupinfo
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🛡️ MODERATION MENU* 」
┃ ▸ ${p}filter
┃ ▸ ${p}unfilter
┃ ▸ ${p}filterlist
┃ ▸ ${p}clearfilter
┃ ▸ ${p}warn
┃ ▸ ${p}unwarn
┃ ▸ ${p}warnings
┃ ▸ ${p}resetwarns
┃ ▸ ${p}warnlist
┃ ▸ ${p}mute
┃ ▸ ${p}unmute
┃ ▸ ${p}mutelist
┃ ▸ ${p}lockgroup
┃ ▸ ${p}unlockgroup
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🛡️ ANTI MENU* 」
┃ ▸ ${p}antitoxic
┃ ▸ ${p}antiforeign
┃ ▸ ${p}antivirus
┃ ▸ ${p}antisticker
┃ ▸ ${p}antipoll
┃ ▸ ${p}anticall
┃ ▸ ${p}antiflood
┃ ▸ ${p}antispam
┃ ▸ ${p}antivv
┃ ▸ ${p}antiedit
┃ ▸ ${p}antidelete
┃ ▸ ${p}antisfw
┃ ▸ ${p}antibot
┃ ▸ ${p}antilink
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *📥 DOWNLOAD MENU* 」
┃ ▸ ${p}play
┃ ▸ ${p}play2
┃ ▸ ${p}vv
┃ ▸ ${p}vv2
┃ ▸ ${p}ytsearch
┃ ▸ ${p}movie
┃ ▸ ${p}tiktok
┃ ▸ ${p}instagram
┃ ▸ ${p}facebook
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🎨 STICKER MENU* 」
┃ ▸ ${p}sticker
┃ ▸ ${p}toimg
┃ ▸ ${p}stickerwm
┃ ▸ ${p}cry
┃ ▸ ${p}happy
┃ ▸ ${p}blush
┃ ▸ ${p}smug
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🌸 ANIME MENU* 」
┃ ▸ ${p}rwaifu
┃ ▸ ${p}waifu
┃ ▸ ${p}animekill
┃ ▸ ${p}animelick
┃ ▸ ${p}animebite
┃ ▸ ${p}animeglomp
┃ ▸ ${p}animehappy
┃ ▸ ${p}animedance
┃ ▸ ${p}animecringe
┃ ▸ ${p}animehighfive
┃ ▸ ${p}animepoke
┃ ▸ ${p}animewink
┃ ▸ ${p}animesmile
┃ ▸ ${p}animesmug
┃ ▸ ${p}animewlp
┃ ▸ ${p}animesearch
┃ ▸ ${p}animeavatar
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🎤 VOICE MENU* 」
┃ ▸ ${p}bass
┃ ▸ ${p}blown
┃ ▸ ${p}earrape
┃ ▸ ${p}deep
┃ ▸ ${p}fast
┃ ▸ ${p}nightcore
┃ ▸ ${p}slow
┃ ▸ ${p}squirrel
┃ ▸ ${p}reverse
┃ ▸ ${p}robot
┃ ▸ ${p}smooth
┃ ▸ ${p}echo
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *✨ GFX MENU* 」
┃ ▸ ${p}gfx1
┃ ▸ ${p}gfx2
┃ ▸ ${p}gfx3
┃ ▸ ${p}gfx4
┃ ▸ ${p}gfx5
┃ ▸ ${p}gfx6
┃ ▸ ${p}gfx7
┃ ▸ ${p}gfx8
┃ ▸ ${p}gfx9
┃ ▸ ${p}gfx10
┃ ▸ ${p}gfx11
┃ ▸ ${p}gfx12
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🖼️ EPHOTO MENU* 」
┃ ▸ ${p}glitchtext
┃ ▸ ${p}advancedglow
┃ ▸ ${p}glowingtext
┃ ▸ ${p}neonglitch
┃ ▸ ${p}makingneon
┃ ▸ ${p}writetext
┃ ▸ ${p}typographytext
┃ ▸ ${p}gradienttext
┃ ▸ ${p}luxurygold
┃ ▸ ${p}pixelglitch
┃ ▸ ${p}flagtext
┃ ▸ ${p}flag3dtext
┃ ▸ ${p}deletingtext
┃ ▸ ${p}underwatertext
┃ ▸ ${p}effectclouds
┃ ▸ ${p}galaxywallpaper
┃ ▸ ${p}blackpinkstyle
┃ ▸ ${p}blackpinklogo
┃ ▸ ${p}logomaker
┃ ▸ ${p}cartoonstyle
┃ ▸ ${p}papercutstyle
┃ ▸ ${p}watercolortext
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🎭 FUN MENU* 」
┃ ▸ ${p}8ball
┃ ▸ ${p}trivia
┃ ▸ ${p}truth
┃ ▸ ${p}dare
┃ ▸ ${p}philosophe
┃ ▸ ${p}joke
┃ ▸ ${p}meme
┃ ▸ ${p}moviequote
┃ ▸ ${p}advice
┃ ▸ ${p}urban
┃ ▸ ${p}funfact
┃ ▸ ${p}fact
┃ ▸ ${p}dog
┃ ▸ ${p}cat
┃ ▸ ${p}coffee
┃ ▸ ${p}propose
┃ ▸ ${p}confess
┃ ▸ ${p}pickup
┃ ▸ ${p}kiss
┃ ▸ ${p}hug
┃ ▸ ${p}love
┃ ▸ ${p}couple
┃ ▸ ${p}breakup
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━「 *🔧 OTHERS MENU* 」
┃ ▸ ${p}dictionary
┃ ▸ ${p}wiki
┃ ▸ ${p}weather
┃ ▸ ${p}time
┃ ▸ ${p}recipe
┃ ▸ ${p}horoscope
┃ ▸ ${p}book
┃ ▸ ${p}getpp
┃ ▸ ${p}jid
┃ ▸ ${p}ai
┃ ▸ ${p}openai
┃ ▸ ${p}qc
┃ ▸ ${p}readqr
┃ ▸ ${p}genpass
┃ ▸ ${p}myip
┃ ▸ ${p}iplookup
┃ ▸ ${p}currency
┃ ▸ ${p}mathfact
┃ ▸ ${p}calculate
┃ ▸ ${p}idch
┃ ▸ ${p}reactch
┃ ▸ ${p}remind
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╔══════════════════════════════╗
║  © 2026 ${CONFIG.NOM_BOT} - ${CONFIG.CREATEUR}
║  Numéro: ${CONFIG.NUMERO}
╚══════════════════════════════╝`;
};

// ==================== FONCTIONS API ====================

const api = {
    waifu: () => axios.get('https://api.waifu.pics/sfw/waifu').then(r => r.data.url),
    hug: () => axios.get('https://api.waifu.pics/sfw/hug').then(r => r.data.url),
    kiss: () => axios.get('https://api.waifu.pics/sfw/kiss').then(r => r.data.url),
    kill: () => axios.get('https://api.waifu.pics/sfw/kill').then(r => r.data.url),
    lick: () => axios.get('https://api.waifu.pics/sfw/lick').then(r => r.data.url),
    bite: () => axios.get('https://api.waifu.pics/sfw/bite').then(r => r.data.url),
    glomp: () => axios.get('https://api.waifu.pics/sfw/glomp').then(r => r.data.url),
    happy: () => axios.get('https://api.waifu.pics/sfw/happy').then(r => r.data.url),
    dance: () => axios.get('https://api.waifu.pics/sfw/dance').then(r => r.data.url),
    cringe: () => axios.get('https://api.waifu.pics/sfw/cringe').then(r => r.data.url),
    highfive: () => axios.get('https://api.waifu.pics/sfw/highfive').then(r => r.data.url),
    poke: () => axios.get('https://api.waifu.pics/sfw/poke').then(r => r.data.url),
    wink: () => axios.get('https://api.waifu.pics/sfw/wink').then(r => r.data.url),
    smile: () => axios.get('https://api.waifu.pics/sfw/smile').then(r => r.data.url),
    smug: () => axios.get('https://api.waifu.pics/sfw/smug').then(r => r.data.url),
    wlp: () => axios.get('https://api.waifu.pics/sfw/wallpaper').then(r => r.data.url),
    
    dog: () => axios.get('https://dog.ceo/api/breeds/image/random').then(r => r.data.message),
    cat: () => axios.get('https://api.thecatapi.com/v1/images/search').then(r => r.data[0].url),
    
    joke: () => axios.get('https://v2.jokeapi.dev/joke/Any?lang=fr').then(r => r.data),
    fact: () => axios.get('https://uselessfacts.jsph.pl/random.json?language=fr').then(r => r.data.text),
    
    ai: (text) => axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=fr`).then(r => r.data.success),
    
    weather: (city) => axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%w+%h`).then(r => r.data),
    
    movie: (title) => axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=thewdb`).then(r => r.data),
    
    tiktok: (url) => axios.get(`https://api.ryzendesu.vip/api/downloader/tiktok?url=${url}`).then(r => r.data),
    
    instagram: (url) => axios.get(`https://api.ryzendesu.vip/api/downloader/ig?url=${url}`).then(r => r.data),
    
    facebook: (url) => axios.get(`https://api.ryzendesu.vip/api/downloader/fb?url=${url}`).then(r => r.data),
    
    dictionary: (word) => axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`).then(r => r.data),
    
    wiki: (query) => axios.get(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`).then(r => r.data),
    
    quote: () => axios.get('https://api.quotable.io/random').then(r => r.data),
    
    advice: () => axios.get('https://api.adviceslip.com/advice').then(r => r.data.slip.advice),
    
    meme: () => axios.get('https://meme-api.com/gimme').then(r => r.data),
    
    urban: (term) => axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`).then(r => r.data),
    
    currency: () => axios.get('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.data),
    
    ip: () => axios.get('https://api.ipify.org?format=json').then(r => r.data.ip),
    
    iplookup: (ip) => axios.get(`http://ip-api.com/json/${ip}`).then(r => r.data)
};

// ==================== GESTIONNAIRE DE COMMANDES ====================

const handleCommand = async (sock, m, command, args) => {
    const sender = m.sender;
    const chat = m.chat;
    const isGroup = m.isGroup;
    const pushName = m.pushName || 'Utilisateur';
    
    // Vérifications de base
    if (CONFIG.BANNED_USERS.includes(sender)) {
        return sock.sendMessage(chat, { text: '❌ Vous êtes banni du bot!' });
    }
    
    if (CONFIG.BLOCKED_USERS.includes(sender)) {
        return;
    }
    
    if (CONFIG.MODE === 'self' && !isOwner(sender)) {
        return sock.sendMessage(chat, { text: '🔒 Mode Self activé. Seul le propriétaire peut utiliser les commandes.' });
    }
    
    if (isGroup && CONFIG.GROUPS_LOCKED.has(chat) && !isOwner(sender)) {
        return;
    }
    
    if (CONFIG.MUTED_USERS.has(sender)) {
        const muteTime = CONFIG.MUTED_USERS.get(sender);
        if (Date.now() < muteTime) {
            return;
        } else {
            CONFIG.MUTED_USERS.delete(sender);
        }
    }
    
    // Exécution de la commande
    switch(command) {
        
        // ==================== OWNER MENU ====================
        case 'menu':
            const menuText = generateMenu(pushName, CONFIG.PREFIXES, runtime(process.uptime()));
            await sock.sendMessage(chat, {
                text: menuText,
                contextInfo: {
                    mentionedJid: [sender],
                    externalAdReply: {
                        title: CONFIG.NOM_BOT,
                        body: `v${CONFIG.VERSION} - ${CONFIG.CREATEUR}`,
                        thumbnailUrl: 'https://i.imgur.com/9Y0YhXj.png',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
            break;
            
        case 'ping':
            const start = speed();
            const msg = await sock.sendMessage(chat, { text: '📊 Calcul...' });
            const end = speed();
            await sock.sendMessage(chat, {
                text: `🏓 *Pong!*\n\n📡 ${(end - start).toFixed(4)} ms\n⚡ ${runtime(process.uptime())}`,
                edit: msg.key
            });
            break;
            
        case 'alive':
            await sock.sendMessage(chat, {
                text: `✅ *${CONFIG.NOM_BOT} est en ligne!*\n\n⏱️ Runtime: ${runtime(process.uptime())}\n👤 Owner: ${CONFIG.CREATEUR}\n📱 Numéro: ${CONFIG.NUMERO}`
            });
            break;
            
        case 'owner':
            await sock.sendMessage(chat, {
                text: `👑 *Propriétaire*\n\n👤 ${CONFIG.CREATEUR}\n📱 ${CONFIG.NUMERO}\n🔗 wa.me/${CONFIG.NUMERO}`
            });
            break;
            
        case 'repo':
            await sock.sendMessage(chat, {
                text: `📦 *Repository*\n\n🔗 https://github.com/${CONFIG.CREATEUR.toLowerCase().replace(' ', '')}/bachir-md\n\n⭐ Mettez une étoile!`
            });
            break;
            
        case 'stats':
            const used = process.memoryUsage();
            let stats = `📊 *STATISTIQUES*\n\n`;
            stats += `💻 CPU: ${os.cpus()[0].model}\n`;
            stats += `🧠 RAM: ${formatBytes(used.rss)}\n`;
            stats += `⚙️ Heap: ${formatBytes(used.heapUsed)}/${formatBytes(used.heapTotal)}\n`;
            stats += `⏱️ Uptime: ${runtime(process.uptime())}\n`;
            stats += `👥 Groupes: ${Object.keys(store.groupMetadata || {}).length}\n`;
            stats += `🚫 Bannis: ${CONFIG.BANNED_USERS.length}\n`;
            stats += `🔇 Mutés: ${CONFIG.MUTED_USERS.size}`;
            await sock.sendMessage(chat, { text: stats });
            break;
            
        case 'self':
            if (!isOwner(sender)) return;
            CONFIG.MODE = 'self';
            await sock.sendMessage(chat, { text: '🔒 Mode Self activé!' });
            break;
            
        case 'public':
            if (!isOwner(sender)) return;
            CONFIG.MODE = 'public';
            await sock.sendMessage(chat, { text: '🌐 Mode Public activé!' });
            break;
            
        case 'ban':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                CONFIG.BANNED_USERS.push(...m.mentionedJid);
                await sock.sendMessage(chat, { text: `✅ ${m.mentionedJid.length} utilisateur(s) banni(s)!` });
            }
            break;
            
        case 'unban':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                CONFIG.BANNED_USERS = CONFIG.BANNED_USERS.filter(u => !m.mentionedJid.includes(u));
                await sock.sendMessage(chat, { text: `✅ ${m.mentionedJid.length} utilisateur(s) débanni(s)!` });
            }
            break;
            
        case 'block':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                for (let user of m.mentionedJid) {
                    await sock.updateBlockStatus(user, 'block');
                    CONFIG.BLOCKED_USERS.push(user);
                }
                await sock.sendMessage(chat, { text: `✅ ${m.mentionedJid.length} utilisateur(s) bloqué(s)!` });
            }
            break;
            
        case 'unblock':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                for (let user of m.mentionedJid) {
                    await sock.updateBlockStatus(user, 'unblock');
                    CONFIG.BLOCKED_USERS = CONFIG.BLOCKED_USERS.filter(u => u !== user);
                }
                await sock.sendMessage(chat, { text: `✅ ${m.mentionedJid.length} utilisateur(s) débloqué(s)!` });
            }
            break;
            
        case 'addsudo':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                CONFIG.SUDO_USERS.push(...m.mentionedJid);
                await sock.sendMessage(chat, { text: `✅ Sudo ajouté!` });
            }
            break;
            
        case 'delsudo':
            if (!isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                CONFIG.SUDO_USERS = CONFIG.SUDO_USERS.filter(u => !m.mentionedJid.includes(u));
                await sock.sendMessage(chat, { text: `✅ Sudo retiré!` });
            }
            break;
            
        case 'sudolist':
            const sudoList = CONFIG.SUDO_USERS.map(u => `@${u.split('@')[0]}`).join('\n');
            await sock.sendMessage(chat, { text: `👑 *Sudo Users:*\n\n${sudoList || 'Aucun'}` });
            break;
            
        // ==================== GROUP MENU ====================
        case 'add':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (!await isBotAdmin(sock, chat)) return sock.sendMessage(chat, { text: '❌ Je ne suis pas admin!' });
            if (args[0]) {
                let num = args[0].replace(/[^0-9]/g, '');
                try {
                    await sock.groupParticipantsUpdate(chat, [`${num}@s.whatsapp.net`], 'add');
                    await sock.sendMessage(chat, { text: `✅ ${num} ajouté!` });
                } catch {
                    await sock.sendMessage(chat, { text: '❌ Impossible d\'ajouter!' });
                }
            }
            break;
            
        case 'kick':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (!await isBotAdmin(sock, chat)) return sock.sendMessage(chat, { text: '❌ Je ne suis pas admin!' });
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                for (let user of m.mentionedJid) {
                    await sock.groupParticipantsUpdate(chat, [user], 'remove');
                }
                await sock.sendMessage(chat, { text: `✅ ${m.mentionedJid.length} expulsé(s)!` });
            }
            break;
            
        case 'promote':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                for (let user of m.mentionedJid) {
                    await sock.groupParticipantsUpdate(chat, [user], 'promote');
                }
                await sock.sendMessage(chat, { text: `✅ Promu(s) admin!` });
            }
            break;
            
        case 'demote':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                for (let user of m.mentionedJid) {
                    await sock.groupParticipantsUpdate(chat, [user], 'demote');
                }
                await sock.sendMessage(chat, { text: `✅ Rétrogradé(s)!` });
            }
            break;
            
        case 'tagall':
        case 'hidetag':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            const group = await sock.groupMetadata(chat);
            let tagText = `📢 *Annonce*\n\n${args.join(' ') || '...'}\n\n`;
            for (let p of group.participants) {
                tagText += `@${p.id.split('@')[0]} `;
            }
            await sock.sendMessage(chat, {
                text: tagText,
                mentions: group.participants.map(p => p.id)
            });
            break;
            
        case 'grouplink':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isBotAdmin(sock, chat)) return sock.sendMessage(chat, { text: '❌ Je ne suis pas admin!' });
            const code = await sock.groupInviteCode(chat);
            await sock.sendMessage(chat, { text: `🔗 https://chat.whatsapp.com/${code}` });
            break;
            
        case 'resetlink':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            await sock.groupRevokeInvite(chat);
            const newCode = await sock.groupInviteCode(chat);
            await sock.sendMessage(chat, { text: `🔗 Nouveau lien: https://chat.whatsapp.com/${newCode}` });
            break;
            
        case 'groupinfo':
            if (!isGroup) return sock.sendMessage(chat, { text: '❌ Groupe uniquement!' });
            const info = await sock.groupMetadata(chat);
            let infoText = `📊 *INFO GROUPE*\n\n`;
            infoText += `📝 Nom: ${info.subject}\n`;
            infoText += `👑 Créateur: @${info.owner.split('@')[0]}\n`;
            infoText += `👥 Membres: ${info.participants.length}\n`;
            infoText += `👮 Admins: ${getGroupAdmins(info.participants).length}\n`;
            infoText += `📅 Créé: ${moment(info.creation * 1000).format('DD/MM/YYYY')}`;
            await sock.sendMessage(chat, { text: infoText, mentions: [info.owner] });
            break;
            
        case 'listadmins':
            if (!isGroup) return;
            const g = await sock.groupMetadata(chat);
            const admins = getGroupAdmins(g.participants);
            let adminList = `👮 *Admins (${admins.length}):*\n\n`;
            for (let a of admins) {
                adminList += `- @${a.split('@')[0]}\n`;
            }
            await sock.sendMessage(chat, { text: adminList, mentions: admins });
            break;
            
        case 'lockgroup':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            CONFIG.GROUPS_LOCKED.add(chat);
            await sock.sendMessage(chat, { text: '🔒 Groupe verrouillé!' });
            break;
            
        case 'unlockgroup':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            CONFIG.GROUPS_LOCKED.delete(chat);
            await sock.sendMessage(chat, { text: '🔓 Groupe déverrouillé!' });
            break;
            
        // ==================== MODERATION ====================
        case 'warn':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const warned = m.mentionedJid[0];
                const count = (CONFIG.WARNINGS.get(warned) || 0) + 1;
                CONFIG.WARNINGS.set(warned, count);
                await sock.sendMessage(chat, {
                    text: `⚠️ @${warned.split('@')[0]} a reçu un avertissement!\n📊 ${count}/3`,
                    mentions: [warned]
                });
                if (count >= 3) {
                    await sock.groupParticipantsUpdate(chat, [warned], 'remove');
                    CONFIG.WARNINGS.delete(warned);
                    await sock.sendMessage(chat, { text: `❌ Expulsé après 3 avertissements!` });
                }
            }
            break;
            
        case 'unwarn':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const warned = m.mentionedJid[0];
                const count = CONFIG.WARNINGS.get(warned) || 0;
                if (count > 0) {
                    CONFIG.WARNINGS.set(warned, count - 1);
                    await sock.sendMessage(chat, { text: `✅ Avertissement retiré!` });
                }
            }
            break;
            
        case 'warnings':
            if (!isGroup) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const warned = m.mentionedJid[0];
                const count = CONFIG.WARNINGS.get(warned) || 0;
                await sock.sendMessage(chat, { text: `📊 @${warned.split('@')[0]} a ${count}/3 avertissements.` });
            }
            break;
            
        case 'mute':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                const muted = m.mentionedJid[0];
                const duration = parseInt(args[0]) || 10;
                CONFIG.MUTED_USERS.set(muted, Date.now() + duration * 60000);
                await sock.sendMessage(chat, {
                    text: `🔇 @${muted.split('@')[0]} muté pour ${duration} min!`,
                    mentions: [muted]
                });
            }
            break;
            
        case 'unmute':
            if (!isGroup) return;
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                CONFIG.MUTED_USERS.delete(m.mentionedJid[0]);
                await sock.sendMessage(chat, { text: `🔊 Utilisateur réactivé!` });
            }
            break;
            
        case 'filter':
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (args[0]) {
                CONFIG.FILTER_WORDS.add(args[0].toLowerCase());
                await sock.sendMessage(chat, { text: `✅ "${args[0]}" filtré!` });
            }
            break;
            
        case 'unfilter':
            if (!await isAdmin(sock, chat, sender) && !isOwner(sender)) return;
            if (args[0]) {
                CONFIG.FILTER_WORDS.delete(args[0].toLowerCase());
                await sock.sendMessage(chat, { text: `✅ "${args[0]}" retiré!` });
            }
            break;
            
        case 'filterlist':
            const filters = Array.from(CONFIG.FILTER_WORDS);
            await sock.sendMessage(chat, { text: `📋 Filtres (${filters.length}):\n${filters.join('\n') || 'Aucun'}` });
            break;
            
        // ==================== ANTI MENU ====================
        case 'antitoxic': CONFIG.ANTI.TOXIC = !CONFIG.ANTI.TOXIC; break;
        case 'antiforeign': CONFIG.ANTI.FOREIGN = !CONFIG.ANTI.FOREIGN; break;
        case 'antivirus': CONFIG.ANTI.VIRUS = !CONFIG.ANTI.VIRUS; break;
        case 'antisticker': CONFIG.ANTI.STICKER = !CONFIG.ANTI.STICKER; break;
        case 'antipoll': CONFIG.ANTI.POLL = !CONFIG.ANTI.POLL; break;
        case 'anticall': CONFIG.ANTI.CALL = !CONFIG.ANTI.CALL; break;
        case 'antiflood': CONFIG.ANTI.FLOOD = !CONFIG.ANTI.FLOOD; break;
        case 'antispam': CONFIG.ANTI.SPAM = !CONFIG.ANTI.SPAM; break;
        case 'antivv': CONFIG.ANTI.VV = !CONFIG.ANTI.VV; break;
        case 'antiedit': CONFIG.ANTI.EDIT = !CONFIG.ANTI.EDIT; break;
        case 'antidelete': CONFIG.ANTI.DELETE = !CONFIG.ANTI.DELETE; break;
        case 'antisfw': CONFIG.ANTI.SFW = !CONFIG.ANTI.SFW; break;
        case 'antibot': CONFIG.ANTI.BOT = !CONFIG.ANTI.BOT; break;
        case 'antilink': CONFIG.ANTI.LINK = !CONFIG.ANTI.LINK; break;
            
        // ==================== DOWNLOAD ====================
        case 'play':
        case 'play2':
            if (!args[0]) return sock.sendMessage(chat, { text: '❌ Titre?' });
            const query = args.join(' ');
            const search = await yts(query);
            const video = search.videos[0];
            if (!video) return sock.sendMessage(chat, { text: '❌ Aucun résultat!' });
            await sock.sendMessage(chat, {
                image: { url: video.thumbnail },
                caption: `🎵 ${video.title}\n👤 ${video.author.name}\n⏱️ ${video.timestamp}`
            });
            const stream = ytdl(video.url, { filter: command === 'play' ? 'audioonly' : 'videoandaudio' });
            if (command === 'play') {
                await sock.sendMessage(chat, { audio: stream, mimetype: 'audio/mp4', fileName: `${video.title}.mp3` });
            } else {
                await sock.sendMessage(chat, { video: stream, caption: video.title });
            }
            break;
            
        case 'ytsearch':
            if (!args[0]) return;
            const ytRes = await yts(args.join(' '));
            let resText = `🔍 *YouTube:*\n\n`;
            ytRes.videos.slice(0, 5).forEach((v, i) => {
                resText += `${i+1}. ${v.title}\n⏱️ ${v.timestamp} | 👁️ ${v.views}\n🔗 ${v.url}\n\n`;
            });
            await sock.sendMessage(chat, { text: resText });
            break;
            
        case 'tiktok':
            if (!args[0]) return;
            try {
                const tt = await api.tiktok(args[0]);
                if (tt.data && tt.data.video) {
                    await sock.sendMessage(chat, { video: { url: tt.data.video }, caption: '📱 TikTok' });
                }
            } catch { await sock.sendMessage(chat, { text: '❌ Erreur!' }); }
            break;
            
        case 'instagram':
            if (!args[0]) return;
            try {
                const ig = await api.instagram(args[0]);
                if (ig.data) {
                    for (let m of ig.data) {
                        await sock.sendMessage(chat, { video: { url: m.url } });
                    }
                }
            } catch { await sock.sendMessage(chat, { text: '❌ Erreur!' }); }
            break;
            
        case 'facebook':
            if (!args[0]) return;
            try {
                const fb = await api.facebook(args[0]);
                if (fb.data && fb.data.url) {
                    await sock.sendMessage(chat, { video: { url: fb.data.url } });
                }
            } catch { await sock.sendMessage(chat, { text: '❌ Erreur!' }); }
            break;
            
        case 'movie':
            if (!args[0]) return;
            const movie = await api.movie(args.join(' '));
            if (movie.Response === 'True') {
                let txt = `🎬 *${movie.Title}*\n📅 ${movie.Year} | ⭐ ${movie.imdbRating}\n🎭 ${movie.Genre}\n⏱️ ${movie.Runtime}\n\n${movie.Plot}`;
                await sock.sendMessage(chat, { image: { url: movie.Poster }, caption: txt });
            } else {
                await sock.sendMessage(chat, { text: '❌ Film non trouvé!' });
            }
            break;
            
        // ==================== STICKER ====================
        case 'sticker':
        case 'stickerwm':
            let media;
            if (m.quoted) media = m.quoted;
            else if (m.mtype === 'imageMessage' || m.mtype === 'videoMessage') media = m;
            else return sock.sendMessage(chat, { text: '❌ Envoyez une image/vidéo!' });
            
            const sticker = new Sticker(await downloadContentFromMessage(media.msg, 'image'), {
                pack: CONFIG.NOM_BOT,
                author: CONFIG.CREATEUR,
                type: StickerTypes.FULL,
                quality: 80
            });
            await sock.sendMessage(chat, await sticker.toMessage());
            break;
            
        case 'toimg':
            if (!m.quoted || m.quoted.mtype !== 'stickerMessage') return;
            const imgBuffer = await downloadContentFromMessage(m.quoted.msg, 'image');
            await sock.sendMessage(chat, { image: imgBuffer });
            break;
            
        // ==================== ANIME ====================
        case 'waifu': case 'rwaifu': await sock.sendMessage(chat, { image: { url: await api.waifu() }, caption: '🌸 Waifu!' }); break;
        case 'animekill': await sock.sendMessage(chat, { video: { url: await api.kill() }, gifPlayback: true }); break;
        case 'animelick': await sock.sendMessage(chat, { video: { url: await api.lick() }, gifPlayback: true }); break;
        case 'animebite': await sock.sendMessage(chat, { video: { url: await api.bite() }, gifPlayback: true }); break;
        case 'animeglomp': await sock.sendMessage(chat, { video: { url: await api.glomp() }, gifPlayback: true }); break;
        case 'animehappy': await sock.sendMessage(chat, { video: { url: await api.happy() }, gifPlayback: true }); break;
        case 'animedance': await sock.sendMessage(chat, { video: { url: await api.dance() }, gifPlayback: true }); break;
        case 'animecringe': await sock.sendMessage(chat, { video: { url: await api.cringe() }, gifPlayback: true }); break;
        case 'animehighfive': await sock.sendMessage(chat, { video: { url: await api.highfive() }, gifPlayback: true }); break;
        case 'animepoke': await sock.sendMessage(chat, { video: { url: await api.poke() }, gifPlayback: true }); break;
        case 'animewink': await sock.sendMessage(chat, { video: { url: await api.wink() }, gifPlayback: true }); break;
        case 'animesmile': await sock.sendMessage(chat, { video: { url: await api.smile() }, gifPlayback: true }); break;
        case 'animesmug': await sock.sendMessage(chat, { video: { url: await api.smug() }, gifPlayback: true }); break;
        case 'animewlp': await sock.sendMessage(chat, { image: { url: await api.wlp() } }); break;
            
        // ==================== FUN ====================
        case 'hug':
            const hugUrl = await api.hug();
            const hugTarget = m.mentionedJid?.[0] || sender;
            await sock.sendMessage(chat, { video: { url: hugUrl }, gifPlayback: true, caption: `🤗 Câlin!`, mentions: [sender, hugTarget] });
            break;
            
        case 'kiss':
            const kissUrl = await api.kiss();
            const kissTarget = m.mentionedJid?.[0] || sender;
            await sock.sendMessage(chat, { video: { url: kissUrl }, gifPlayback: true, caption: `💋 Bisou!`, mentions: [sender, kissTarget] });
            break;
            
        case 'dog': await sock.sendMessage(chat, { image: { url: await api.dog() }, caption: '🐕 Chien!' }); break;
        case 'cat': await sock.sendMessage(chat, { image: { url: await api.cat() }, caption: '🐱 Chat!' }); break;
        case 'joke':
            const j = await api.joke();
            await sock.sendMessage(chat, { text: j.type === 'single' ? j.joke : `${j.setup}\n\n${j.delivery}` });
            break;
        case 'fact': case 'funfact': await sock.sendMessage(chat, { text: await api.fact() }); break;
        case 'advice': await sock.sendMessage(chat, { text: await api.advice() }); break;
        case '8ball':
            const reponses = ['Oui', 'Non', 'Peut-être', 'Je ne sais pas', 'Certainement', 'Absolument pas'];
            await sock.sendMessage(chat, { text: `🎱 ${reponses[Math.floor(Math.random() * reponses.length)]}` });
            break;
            
        // ==================== OTHERS ====================
        case 'ai': case 'openai':
            if (!args[0]) return;
            const aiRes = await api.ai(args.join(' '));
            await sock.sendMessage(chat, { text: `🤖 ${aiRes}` });
            break;
            
        case 'weather':
            if (!args[0]) return;
            const weather = await api.weather(args.join(' '));
            await sock.sendMessage(chat, { text: `🌤️ ${args.join(' ')}: ${weather}` });
            break;
            
        case 'time':
            const tz = args[0] || 'Europe/Paris';
            await sock.sendMessage(chat, { text: `🕐 ${tz}: ${moment().tz(tz).format('DD/MM/YYYY HH:mm:ss')}` });
            break;
            
        case 'calculate':
            if (!args[0]) return;
            try {
                const calc = eval(args.join(' '));
                await sock.sendMessage(chat, { text: `🧮 ${args.join(' ')} = ${calc}` });
            } catch { await sock.sendMessage(chat, { text: '❌ Calcul invalide!' }); }
            break;
            
        case 'dictionary':
            if (!args[0]) return;
            try {
                const def = await api.dictionary(args[0]);
                let defText = `📖 *${def[0].word}*\n\n`;
                def[0].meanings[0].definitions.slice(0, 3).forEach((d, i) => {
                    defText += `${i+1}. ${d.definition}\n`;
                });
                await sock.sendMessage(chat, { text: defText });
            } catch { await sock.sendMessage(chat, { text: '❌ Mot non trouvé!' }); }
            break;
            
        case 'wiki':
            if (!args[0]) return;
            try {
                const wiki = await api.wiki(args.join(' '));
                await sock.sendMessage(chat, { text: `📚 *${wiki.title}*\n\n${wiki.extract}\n\n🔗 ${wiki.content_urls?.desktop?.page}` });
            } catch { await sock.sendMessage(chat, { text: '❌ Page non trouvée!' }); }
            break;
            
        case 'getpp':
            let target = m.mentionedJid?.[0] || sender;
            try {
                const pp = await sock.profilePictureUrl(target, 'image');
                await sock.sendMessage(chat, { image: { url: pp } });
            } catch { await sock.sendMessage(chat, { text: '❌ Pas de photo!' }); }
            break;
            
        case 'myip':
            const ip = await api.ip();
            await sock.sendMessage(chat, { text: `🌐 Votre IP: ${ip}` });
            break;
            
        case 'iplookup':
            if (!args[0]) return;
            const ipInfo = await api.iplookup(args[0]);
            if (ipInfo.status === 'success') {
                await sock.sendMessage(chat, { text: `📍 IP: ${ipInfo.query}\n🏙️ Ville: ${ipInfo.city}\n🌍 Pays: ${ipInfo.country}\n📡 FAI: ${ipInfo.isp}` });
            }
            break;
            
        case 'connect':
            await sock.sendMessage(chat, { text: `🔗 *PAIR CODE*\n\nContactez le propriétaire:\nwa.me/${CONFIG.NUMERO}` });
            break;
            
        case 'setprefix':
            if (!isOwner(sender)) return;
            if (args[0]) {
                CONFIG.PREFIXES = [args[0]];
                await sock.sendMessage(chat, { text: `✅ Préfixe changé en: ${args[0]}` });
            }
            break;
            
        default:
            // Commande inconnue - ne rien faire
            break;
    }
};

// ==================== CONNEXION WHATSAPP ====================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_NAME);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: [CONFIG.NOM_BOT, 'Safari', CONFIG.VERSION],
        getMessage: async key => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: 'Message non disponible' };
        }
    });

    store.bind(sock.ev);
    
    // QR Code dans le terminal
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log(chalk.yellow('📱 Scannez le QR Code!'));
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red('❌ Déconnecté, reconnexion...'));
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✅ ${CONFIG.NOM_BOT} connecté!`));
            console.log(chalk.cyan(figlet.textSync(CONFIG.NOM_BOT, { horizontalLayout: 'full' })));
            console.log(chalk.green('═'.repeat(50)));
            console.log(chalk.yellow(`👤 Créateur: ${CONFIG.CREATEUR}`));
            console.log(chalk.yellow(`📱 Numéro: ${CONFIG.NUMERO}`));
            console.log(chalk.yellow(`📦 Version: ${CONFIG.VERSION}`));
            console.log(chalk.green('═'.repeat(50)));
            
            // Message de démarrage
            await sock.sendMessage(CONFIG.OWNER[0], {
                text: `✅ *${CONFIG.NOM_BOT} v${CONFIG.VERSION}*\n\n🟢 Connecté avec succès!\n👤 ${CONFIG.CREATEUR}\n📅 ${getTime()}\n\nTapez .menu`
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Gestion des messages
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            if (m.key.remoteJid === 'status@broadcast') return;
            
            m = sms(sock, m);
            
            // Anti-spam/flood
            if (CONFIG.ANTI.FLOOD || CONFIG.ANTI.SPAM) {
                const now = Date.now();
                const userMessages = CONFIG.MESSAGE_COUNT.get(m.sender) || [];
                userMessages.push(now);
                const recent = userMessages.filter(t => now - t < 5000);
                CONFIG.MESSAGE_COUNT.set(m.sender, recent);
                if (recent.length > 5) {
                    return;
                }
            }
            
            // Anti-lien
            if (CONFIG.ANTI.LINK && m.isGroup && m.body && m.body.match(/(https?:\/\/[^\s]+)/)) {
                const isAdm = await isAdmin(sock, m.chat, m.sender);
                if (!isAdm && !isOwner(m.sender)) {
                    await sock.sendMessage(m.chat, { delete: m.key });
                    await sock.sendMessage(m.chat, { text: `⚠️ @${m.sender.split('@')[0]} liens interdits!` });
                    return;
                }
            }
            
            // Anti-toxic (mots interdits)
            if (CONFIG.ANTI.TOXIC && m.body) {
                const toxicWords = ['connard', 'salope', 'pute', 'fdp', 'ntm', 'enculé', 'batard', 'merde', 'con', 'idiot', 'débile', 'stupide', 'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'motherfucker', 'nigger', 'faggot', 'retard', 'whore', 'slut', 'bastard', 'damn', 'hell', 'crap', 'piss', 'wanker', 'bollocks', 'twat', 'prat', 'git', 'tosser', 'sod', 'bugger', 'arse', 'arsehole', 'bellend', 'knob', 'plonker', 'muppet', 'numpty', 'pillock', 'wazzock', 'div', 'berk', 'minge', 'munter', 'nonce', 'ponce', 'spastic', 'spaz', 'mong', 'windowlicker', 'gimp', 'cripple', 'lunatic', 'psycho', 'nutter', 'loony', 'fruitcake', 'wacko', 'nutjob', 'crackpot', 'screwball', 'kook', 'oddball', 'weirdo', 'freak', 'geek', 'nerd', 'dork', 'dweeb', 'wonk', 'anorak', 'boffin', 'egghead', 'brainbox', 'smartass', 'wiseguy', 'knowall', 'cleverclogs', 'smarty-pants', 'smart aleck'];
                const msgLower = m.body.toLowerCase();
                for (let word of toxicWords) {
                    if (msgLower.includes(word)) {
                        await sock.sendMessage(m.chat, { delete: m.key });
                        await sock.sendMessage(m.chat, { text: `⚠️ @${m.sender.split('@')[0]} langage inapproprié!` });
                        return;
                    }
                }
            }
            
            // Filtres personnalisés
            if (m.body && CONFIG.FILTER_WORDS.size > 0) {
                for (let word of CONFIG.FILTER_WORDS) {
                    if (m.body.toLowerCase().includes(word.toLowerCase())) {
                        await sock.sendMessage(m.chat, { delete: m.key });
                        await sock.sendMessage(m.chat, { text: `⚠️ @${m.sender.split('@')[0]} mot interdit!` });
                        return;
                    }
                }
            }
            
            // Anti-virus (fichiers suspects)
            if (CONFIG.ANTI.VIRUS && m.mtype) {
                const dangerousTypes = ['documentMessage', 'applicationMessage'];
                if (dangerousTypes.includes(m.mtype)) {
                    await sock.sendMessage(m.chat, { delete: m.key });
                    return;
                }
            }
            
            // Anti-vue unique
            if (CONFIG.ANTI.VV && m.mtype === 'viewOnceMessage') {
                await sock.sendMessage(m.chat, { delete: m.key });
                return;
            }
            
            // Anti-sticker
            if (CONFIG.ANTI.STICKER && m.mtype === 'stickerMessage' && m.isGroup) {
                const isAdm = await isAdmin(sock, m.chat, m.sender);
                if (!isAdm && !isOwner(m.sender)) {
                    await sock.sendMessage(m.chat, { delete: m.key });
                    return;
                }
            }
            
            // Anti-poll
            if (CONFIG.ANTI.POLL && m.mtype === 'pollCreationMessage' && m.isGroup) {
                const isAdm = await isAdmin(sock, m.chat, m.sender);
                if (!isAdm && !isOwner(m.sender)) {
                    await sock.sendMessage(m.chat, { delete: m.key });
                    return;
                }
            }
            
            // Anti-bot
            if (CONFIG.ANTI.BOT && m.isGroup) {
                // Logique anti-bot basée sur des patterns
                if (m.body && m.body.includes('🤖') && m.body.length < 10) {
                    const isAdm = await isAdmin(sock, m.chat, m.sender);
                    if (!isAdm && !isOwner(m.sender)) {
                        await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
                    }
                }
            }
            
            // Traitement des commandes
            let usedPrefix = false;
            for (let p of CONFIG.PREFIXES) {
                if (m.body && m.body.startsWith(p)) {
                    usedPrefix = p;
                    break;
                }
            }
            
            if (!usedPrefix) return;
            
            const args = m.body.slice(usedPrefix.length).trim().split(/ +/);
            const command = args.shift()?.toLowerCase();
            
            if (command) {
                await handleCommand(sock, m, command, args);
            }
            
        } catch (e) {
            console.error(chalk.red('Erreur:'), e);
        }
    });

    // Gestion des appels
    sock.ev.on('call', async (call) => {
        if (CONFIG.ANTI.CALL) {
            await sock.rejectCall(call.id, call.from);
            await sock.sendMessage(call.from, { text: '❌ Appels bloqués automatiquement!' });
        }
    });

    // Anti-delete
    sock.ev.on('messages.update', async (update) => {
        if (CONFIG.ANTI.DELETE) {
            for (let msg of update) {
                if (msg.update?.message?.protocolMessage?.type === 0) {
                    const key = msg.update.key;
                    const deletedMsg = store.messages[key.remoteJid]?.get(key.id);
                    if (deletedMsg) {
                        await sock.sendMessage(key.remoteJid, {
                            text: `🗑️ *Message supprimé détecté!*\n\n👤 @${key.participant?.split('@')[0] || key.remoteJid.split('@')[0]}\n📝 ${deletedMsg.message?.conversation || deletedMsg.message?.extendedTextMessage?.text || '[Média]'}`,
                            mentions: [key.participant || key.remoteJid]
                        });
                    }
                }
            }
        }
    });

    return sock;
}

// ==================== DÉMARRAGE ====================
console.clear();
console.log(chalk.cyan(figlet.textSync(CONFIG.NOM_BOT, { horizontalLayout: 'full' })));
console.log(chalk.green('═'.repeat(50)));
console.log(chalk.yellow(`👤 CREATOR: ${CONFIG.CREATEUR}`));
console.log(chalk.yellow(`🤖 BOT: ${CONFIG.NOM_BOT}`));
console.log(chalk.yellow(`📦 VERSION: ${CONFIG.VERSION}`));
console.log(chalk.yellow(`📱 NUMERO: ${CONFIG.NUMERO}`));
console.log(chalk.green('═'.repeat(50)));
console.log(chalk.blue('🚀 Démarrage en cours...\n'));

startBot().catch(e => console.error(chalk.red('Erreur fatale:'), e));
