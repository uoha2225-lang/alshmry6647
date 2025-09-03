const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const tokens = require('./tokens');

// إعداد العميل للبوتات
const createBotClient = (intents = []) => {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
            ...intents
        ]
    });
};

// بوت التذكيرات (Tickets)
const ticketBot = createBotClient();
ticketBot.commands = new Collection();
ticketBot.activeTickets = new Collection(); // لحفظ التذاكر النشطة

// بوت التقييمات
const reviewBot = createBotClient();
reviewBot.reviewStats = new Collection(); // لحفظ إحصائيات التقييمات

// وظائف مساعدة للتذاكر
const createTicketMainEmbed = () => {
    return new EmbedBuilder()
        .setTitle('أهتم    تذكرتك    واحضر    مايناسبك')
        .setDescription('فتح تذكرة من هنا')
        .setImage('https://i.imgur.com/qren-store-bg.png') // ستحتاج لرفع صورة Qren Store
        .setColor(0x2F3136)
        .setTimestamp();
};

const createTicketOptionsEmbed = () => {
    return new EmbedBuilder()
        .setTitle('فتح تذكرة من هنا')
        .setColor(0x2F3136);
};

const createTicketEmbed = (ticketType, description, user) => {
    const embed = new EmbedBuilder()
        .setTitle(`🎫 تذكرة جديدة - ${ticketType}`)
        .setDescription(description)
        .addFields(
            { name: 'نوع التذكرة:', value: ticketType, inline: true },
            { name: 'المستخدم:', value: `<@${user.id}>`, inline: true },
            { name: 'التاريخ:', value: new Date().toLocaleString('ar-SA'), inline: true }
        )
        .setColor(0x00AE86)
        .setImage('https://i.imgur.com/qren-store-logo.png') // صورة Qren Store كما طلبت
        .setTimestamp()
        .setFooter({ text: 'نظام التذاكر' });
    
    return embed;
};

// وظائف مساعدة للتقييمات
const createReviewEmbed = (rating, reviewerUser, reviewId, reviewCount) => {
    const stars = '⭐'.repeat(Math.max(1, Math.min(5, rating)));
    const currentDate = new Date().toLocaleString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return new EmbedBuilder()
        .setTitle('شكرًا على التقييم!')
        .addFields(
            { name: 'رسالة التقييم:', value: 'تم', inline: false },
            { name: 'التقييم:', value: stars, inline: false },
            { name: 'رقم التقييم:', value: reviewId.toString(), inline: false },
            { name: 'المقيم:', value: `<@${reviewerUser.id}>`, inline: false },
            { name: 'تاريخ التقييم:', value: currentDate, inline: false }
        )
        .setColor(0x00AE86)
        .setFooter({ 
            text: 'جميع الحقوق محفوظة © NiFy', 
            iconURL: 'https://cdn.discordapp.com/attachments/your-attachment-url/nify-logo.png' 
        });
};

// إنشاء الأزرار
const createTicketMainButton = () => {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket_menu')
                .setLabel('فتح تذكرة من هنا')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );
    return row;
};

const createTicketOptionsButtons = () => {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_buy')
                .setLabel('للشراء')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🛍️'),
            new ButtonBuilder()
                .setCustomId('ticket_inquiry')
                .setLabel('للاستفسار')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓'),
            new ButtonBuilder()
                .setCustomId('ticket_problem')
                .setLabel('لحل مشكلة')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔧')
        );
    return row;
};

// أوامر بوت التذاكر
ticketBot.on('ready', () => {
    console.log(`بوت التذاكر جاهز! مسجل باسم ${ticketBot.user.tag}`);
});

ticketBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(tokens.PREFIX)) return;

    const args = message.content.slice(tokens.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case 'تذكرة':
            case 'ticket':
                const mainEmbed = createTicketMainEmbed();
                const mainButton = createTicketMainButton();
                
                await message.channel.send({ 
                    embeds: [mainEmbed], 
                    components: [mainButton] 
                });
                await message.delete().catch(() => {});
                break;

            case 'اوامر_التذاكر':
            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📋 أوامر بوت التذاكر')
                    .setDescription(
                        `**الأوامر المتاحة:**\n\n` +
                        `\`!تذكرة\` - فتح نظام التذاكر\n` +
                        `\`!اوامر_التذاكر\` - عرض هذه القائمة`
                    )
                    .setColor(0x3498db);
                
                await message.channel.send({ embeds: [helpEmbed] });
                break;
        }
    } catch (error) {
        console.error('خطأ في بوت التذاكر:', error);
        message.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }
});

// معالجة الأزرار
ticketBot.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
        switch (interaction.customId) {
            case 'open_ticket_menu':
                const optionsEmbed = createTicketOptionsEmbed();
                const optionsButtons = createTicketOptionsButtons();
                
                await interaction.update({ 
                    embeds: [optionsEmbed], 
                    components: [optionsButtons] 
                });
                break;

            case 'ticket_buy':
                const buyEmbed = createTicketEmbed(
                    'للشراء',
                    'هذه التذكرة مخصصة لشراء المنتجات',
                    interaction.user
                );
                
                await interaction.reply({ 
                    embeds: [buyEmbed], 
                    ephemeral: false 
                });
                break;

            case 'ticket_inquiry':
                const inquiryEmbed = createTicketEmbed(
                    'للاستفسار',
                    'هذه التذكرة مخصصة للإجابة على استفساراتكم',
                    interaction.user
                );
                
                await interaction.reply({ 
                    embeds: [inquiryEmbed], 
                    ephemeral: false 
                });
                break;

            case 'ticket_problem':
                const problemEmbed = createTicketEmbed(
                    'لحل مشكلة',
                    'هذه التذكرة مخصصة في حال كان لديك مشكلة',
                    interaction.user
                );
                
                await interaction.reply({ 
                    embeds: [problemEmbed], 
                    ephemeral: false 
                });
                break;
        }
    } catch (error) {
        console.error('خطأ في معالجة الأزرار:', error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'حدث خطأ أثناء معالجة طلبك', ephemeral: true });
        }
    }
});

// بوت التقييمات
reviewBot.on('ready', () => {
    console.log(`بوت التقييمات جاهز! مسجل باسم ${reviewBot.user.tag}`);
});

reviewBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // التحقق من وجود أرقام في الرسالة (تقييم من 1-5)
    const ratingMatch = message.content.match(/[1-5]/);
    if (!ratingMatch) return;
    
    const rating = parseInt(ratingMatch[0]);
    
    try {
        // حذف الرسالة الأصلية
        await message.delete().catch(() => {});
        
        // الحصول على إحصائيات التقييم للمستخدم
        const userId = message.author.id;
        let userStats = reviewBot.reviewStats.get(userId) || { count: 0, lastReviewId: 2000 };
        userStats.count++;
        userStats.lastReviewId++;
        reviewBot.reviewStats.set(userId, userStats);
        
        // إنشاء embed التقييم
        const reviewEmbed = createReviewEmbed(rating, message.author, userStats.lastReviewId, userStats.count);
        
        // إرسال التقييم
        await message.channel.send({ embeds: [reviewEmbed] });
        
    } catch (error) {
        console.error('خطأ في بوت التقييمات:', error);
    }
});

module.exports = {
    ticketBot,
    reviewBot,
    createTicketMainEmbed,
    createTicketOptionsEmbed,
    createTicketEmbed,
    createReviewEmbed
};