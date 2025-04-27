const { Telegraf, Scenes, Markup, session } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

const connectDB = require('./db');
const Post = require('../models/Post');

const bot = new Telegraf(process.env.TOKEN, { polling: true });

// Подключаемся к MongoDB
connectDB();

bot.telegram.setMyCommands([
    { command: '/start', description: 'Start' },
])

async function showPosts(ctx, postId) {
    const posts = await Post.find({});
    const post = posts.find((element) => {
        return element.post_id === postId
    });
    console.log(post);
    
    await ctx.reply(`<b>🕒 ЮКЛАНГАН САНА: ➡️</b> ${post.createdAt.toLocaleString("ru-RU")}`, { parse_mode: 'HTML' });
    await ctx.reply(`<b>📌 ИШ ТУРИ: ➡️</b> ${post.category}`, { parse_mode: 'HTML' });
    await ctx.reply(`<b>🛏 ЯШАШ ЖОЙИ БЕРИЛАДИМИ: ➡️</b> ${post.hous}`, { parse_mode: 'HTML' });
    await ctx.reply(`<b>📍 КАЙСИ ШАХАРДА ЖОЙЛАШГАН: ➡️</b> ${post.city}`, { parse_mode: 'HTML' });
    await ctx.reply(`<b>📞 БОГЛАНИШ: ➡️</b> ${post.contacts}`, { parse_mode: 'HTML' });
    if (post.telegram.length > 4) {
        await ctx.reply(`<b>ТЕЛЕГРАМ: ➡️</b> ${post.telegram}`, { parse_mode: 'HTML' });
    }
    if (post.instagram.length > 4) {
        await ctx.reply(`<b>ИНСТАГРАМ: ➡️</b> ${post.instagram}`, { parse_mode: 'HTML' });
    }
    if (post.images.length > 4) {
        await ctx.reply('<b>КУШИМЧА ФОТО ⤵️</b>', { parse_mode: 'HTML' });
        await ctx.replyWithPhoto(post.images);
    }
    if (post.locationimages.length > 4) {
        await ctx.reply('<b>ФОТО МАНЗИЛ ⤵️</b>', { parse_mode: 'HTML' });
        await ctx.replyWithPhoto(post.locationimages);
    }
}

const postWizard = new Scenes.WizardScene(
    'post-wizard',
    async (ctx) => {

        if (ctx.from.id !== +process.env.ADMIN_ID) {
            ctx.scene.leave();
            return ctx.reply('⛔');
        }
        ctx.wizard.state.data = {};
        await ctx.reply('1️⃣ Отправь изображение для поста');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }

        if (!ctx.message.photo) return ctx.reply('Пожалуйста, отправьте изображение.');
        ctx.wizard.state.data.photo = ctx.message.photo.pop().file_id;

        await ctx.reply('2️⃣ Введите хэштеги');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.data.hashtag = ctx.message.text;
        await ctx.reply('3️⃣ Введите название вакансии');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.title = ctx.message.text;
        await ctx.reply('6️⃣ Введите адрес');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.address = ctx.message.text;
        await ctx.reply('6️⃣ Введите метро');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.data.metro = ctx.message.text;
        await ctx.reply('4️⃣ Введите количество работников');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.count = ctx.message.text;
        await ctx.reply('5️⃣ Введите зарплату');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.salary = ctx.message.text;
        await ctx.reply('8️⃣ Требования');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.requirements = ctx.message.text;
        await ctx.reply('9️⃣ Обязанности');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.duties = ctx.message.text;
        await ctx.reply('🔟 Дополнительная информация');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.additional = ctx.message.text;
        await ctx.reply('1️⃣1️⃣ Контакты');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.contacts = ctx.message.text;
        const data = ctx.wizard.state.data;
        const postId = `post_${Date.now()}`;
        ctx.wizard.state.data.post_id = postId;

        const caption = `
    ${data.hashtag}
    
<b>📌 ${data.title}\n</b>
• <b>👤 Ишчи: </b> ${data.count}
• <b>💰 Маош: </b> ${data.salary}
• <b>📍 Манзил: </b> ${data.address}
• <b>Ⓜ️: </b> ${data.metro}
• <b>Холат: </b> #фаол
  
📋 <b>Сиздан талаб килинади:</b>
${data.requirements}
  
🛠 <b>Вазифа:</b>
${data.duties}
  
ℹ️ <b>Кушимча:</b>
${data.additional}
  
📞 <b>Богланиш учун:</b>
${data.contacts}
  
👉🏻 <b>Эълон жойлаш учун:</b> @bk_juraev
    
🤖 @IshTopdimRuBot —  сизнинг ёрдамчингиз!`;

        await ctx.telegram.sendPhoto(process.env.CHANNEL_ID, data.photo, {
            caption,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔍 Батафсил',
                            url: `https://t.me/${ctx.botInfo.username}?start=${postId}`,
                        },
                    ],
                ],
            },
        });
        await ctx.reply('✅ Пост опубликован.');
        await ctx.reply('Кушимча маълумот киритинг.');
        await ctx.reply('Иш урни кайси турга мансуб?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.category = ctx.message.text;
        await ctx.reply('Yashash uchun joy beriladimi?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.hous = ctx.message.text;
        await ctx.reply('Qaysi shaharda joylashgan?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.city = ctx.message.text;
        await ctx.reply('Telegram sahifasi?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.telegram = ctx.message.text;
        await ctx.reply('Instagram sahifasi?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.instagram = ctx.message.text;
        await ctx.reply('Web sayti?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.website = ctx.message.text;
        await ctx.reply('Foto suratlari?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.data.images = ctx.message.photo.pop().file_id;
        await ctx.reply('Manzilning suratlari?');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === '/cancel') {
            await ctx.reply('❌ Создание поста отменено.');
            return ctx.scene.leave();
        }
        ctx.wizard.state.data.locationimages = ctx.message.photo.pop().file_id;
        const data = ctx.wizard.state.data;
        console.log(ctx.startPayload);
        // Пример создания и сохранения поста
        const post = new Post({
            post_id: data.post_id,
            headimg: data.photo,
            hashtag: data.hashtag,
            title: data.title,
            address: data.address,
            metro: data.metro,
            count: data.count,
            salary: data.salary,
            status: data.status,
            requirements: data.requirements,
            duties: data.duties,
            additional: data.additional,
            contacts: data.contacts,
            adminLink: data.adminLink,
            botAd: data.botAd,
            category: data.category,
            hous: data.hous,
            city: data.city,
            reviews: data.reviews,
            telegram: data.telegram,
            instagram: data.instagram,
            website: data.website,
            images: data.images,
            locationimages: data.locationimages,
        });
        await post.save();
        ctx.reply('✅ Пост сохранён!');
        return ctx.scene.leave();
    }
);

const stage = new Scenes.Stage([postWizard]);
bot.use(session());
bot.use(stage.middleware());

// 🚀 Команда для запуска мастера публикации
bot.command('post', (ctx) => ctx.scene.enter('post-wizard'));

// ✅ Команда для отмены создания поста
bot.command('cancel', (ctx) => {
    ctx.reply('❌ Создание поста отменено.');
    ctx.scene.leave();
});



// Построитель главного меню
async function homeMessageBuilder(ctx) {
    const lang = ctx.session.lang || 'uz';
    try {
        await ctx.reply(
            {
                'uz': '🏠 Асосий меню',
            }[lang],
            Markup.inlineKeyboard([
                [Markup.button.url({
                    'uz': 'Иш излаш 🔍',
                }[lang], 'https://t.me/ishtopdimru')],
                [Markup.button.callback({
                    'uz': 'Уй излаш 🛏',
                }[lang], 'yashash')],
                [Markup.button.callback({
                    'uz': 'Юридик ёрдам ⚖️',
                }[lang], 'yuridik')],
                [Markup.button.url({
                    'uz': 'Хабар бериш ✉️',
                }[lang], 'https://t.me/bk_juraev')],
                [Markup.button.url({
                    'uz': 'Богланиш 🔄',
                }[lang], 'https://t.me/bk_juraev')]
            ])
        );
    } catch (error) {
        console.log('Error while slecting', error);
    }
}
// 📌 Обработка /start с параметром
bot.start((ctx) => {
    const postId = ctx.startPayload;
    
    if (postId) {
        showPosts(ctx, postId)
        // ctx.reply('Открыть подробности:', {
        //     parse_mode: 'HTML',
        //     reply_markup: {
        //         inline_keyboard: [
        //             [
        //                 {
        //                     text: '📲 Открыть WebApp',
        //                     web_app: { url: `${process.env.WEBAPPURL}?post=${postId}` }
        //                 }
        //             ]
        //         ]
        //     }
        // });
    } else {
        homeMessageBuilder(ctx)
    }
});
// Обработчик выбора "yuridik"
bot.action('yuridik', async (ctx) => {
    const chatId = ctx.chat.id;
    ctx.session.lastMessageId = ctx.update.callback_query.message.message_id;

    try {
        await ctx.editMessageText(
            'Юридик ёрдам ва хизматлар булими тез кунларда ишга тушади!',
            Markup.inlineKeyboard([
                [Markup.button.callback('Оркага', 'home')]
            ])
        );
    } catch (error) {
        console.log('Error while slecting', error);
    }
});
// Обработчик выбора "yashash"
bot.action('yashash', async (ctx) => {
    const chatId = ctx.chat.id;
    ctx.session.lastMessageId = ctx.update.callback_query.message.message_id;

    try {
        await ctx.editMessageText(
            'Квартиралар кидирув булими якин вактларда ажойиб кулайликлар билан ишга тушади!',
            Markup.inlineKeyboard([
                [Markup.button.callback('Оркага', 'home')]
            ])
        );
    } catch (error) {
        console.log('Error while slecting', error);
    }
});
bot.action('home', async (ctx) => {
    const chatId = ctx.chat.id;
    ctx.session.lastMessageId = ctx.update.callback_query.message.message_id;
    const lang = ctx.session.lang || 'uz';

    try {
        await ctx.editMessageText(
            {
                'uz': '🏠 Асосий меню',
            }[lang],
            Markup.inlineKeyboard([
                [Markup.button.url({
                    'uz': 'Иш излаш 🔍',
                }[lang], 'https://t.me/ishtopdimru')],
                [Markup.button.callback({
                    'uz': 'Уй излаш 🛏',
                }[lang], 'yashash')],
                [Markup.button.callback({
                    'uz': 'Юридик ёрдам ⚖️',
                }[lang], 'yuridik')],
                [Markup.button.url({
                    'uz': 'Хабар бериш ✉️',
                }[lang], 'https://t.me/bk_juraev')],
                [Markup.button.url({
                    'uz': 'Богланиш 🔄',
                }[lang], 'https://t.me/bk_juraev')]
            ])
        );
    } catch (error) {
        console.log('Error while slecting', error);
    }
});











bot.launch();

// 🌐 WebApp сервер
const app = express();
app.use(express.static(path.join(__dirname, 'webapp')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webapp', 'index.html'));
});

app.listen(3000, () => {
    console.log('🌐 WebApp работает на http://localhost:3000');
});




