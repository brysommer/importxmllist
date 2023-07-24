const axios = require('axios');
const xml2js = require('xml2js');
const { parseString } = xml2js;
const fs = require('fs');
const XLSX = require('xlsx');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('6033856238:AAEUyg7tcey_gkWQx7S6V3OqGNABA9HaFE4', { polling: true });

function findCategoryById(categories, id) {
  for (const category of categories) {
    if (category.$ && category.$.id === id) {
      return category._;
    }
  }
  return null;
}

const getXMLPrice = async() => {
  try {
    const response = await axios.get('https://jumper-cloud.fra1.digitaloceanspaces.com/93280288/export/yml/8/export_hotline.xml?uuid=557423');
    return response.data;
  } catch (error) {
    console.error('Помилка при отриманні XML: ', error);
    throw error;
  }
}

function convertXMLToCSV(xmlData) {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (error, result) => {
      if (error) {
        console.error('Помилка при парсингу XML: ', error);
        reject(error);
      } else {
        let csvData = [];
        const  items  = result.yml_catalog.shop[0].offers[0].offer;
        const  cats  = result.yml_catalog.shop[0].categories[0].category;

        csvData.push([
          'ID',
          'STOCK',
          'URL',
          'PRICE',
          'CURRENCY',
          'CAT',
          'CategoryName',
          'PIC',
          'NAME',
          'VENDOR',
          'VENDOR CODE',
          'DESC',
          'PICKUP',
          'WARRANTY',
          'PARAMS',
        ]
        );

        items.forEach((item) => {
          csvData.push([
            item['$'].id,
            item['$'].available,
            item.url[0],
            item.price[0],
            item.currencyId[0],
            item.categoryId[0],
            findCategoryById(cats, item.categoryId[0]),
            item.picture[0],
            item.name[0],
            item.vendor[0],
            item.vendorCode[0],
            item.description[0],
            item['pickup-options'][0].option[0]['$'].days,
            item.manufacturer_warranty[0],
            item.param[0]['_'],
          ]
          );
        });
        resolve(csvData);
      }
    });
  });
}
function writeArrayToXLS(arrayData, xlsFilePath) {
  try {
    const workbook = XLSX.utils.book_new();
    const sheetName = 'Sheet1';
    const worksheet = XLSX.utils.aoa_to_sheet(arrayData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, xlsFilePath);
    console.log('Масив успішно записано в XLS.');
  } catch (error) {
    console.error('Помилка під час запису масиву в XLS:', error);
  }
}

async function run() {
  try {
    const xmlData = await getXMLPrice();
    const dataArray = await convertXMLToCSV(xmlData)
    writeArrayToXLS(dataArray, 'price.xls');
  } catch (error) {
    console.error('Помилка: ', error);
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const filePath = './price.xls';
  if(msg.text === 'all') {
    await run();
    fs.access('./price.xls', fs.constants.F_OK, (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Файл price.xls не знайдено!');
        return;
      }
      bot.sendDocument(chatId, filePath)
        .catch((error) => {
          bot.sendMessage(chatId, 'Виникла помилка під час відправлення файлу.');
          console.error(error);
      });
    });
  }
});


const sendMorningMessage = async () => {
  try {
    const chatId = '@mmarketkiev'; 
    await run();
    fs.access('./price.xls', fs.constants.F_OK, (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Файл price.xls не знайдено!');
        return;
      }
      bot.sendDocument(chatId, './price.xls', { 
        reply_markup: { 
          inline_keyboard: [[
            { 
              text: 'Для замовлення або запитань перейдіть в чат з менеджером',
              url: 'https://t.me/mmarketkiev_bot',
            }
          ]]
        }})
        .catch((error) => {
          bot.sendMessage(chatId, 'Виникла помилка під час відправлення файлу.');
          console.error(error);
      });
    });
    console.log('Повідомлення надіслано успішно.');
  } catch (error) {
    console.error('Помилка при надсиланні повідомлення:', error.message);
  }
};

const checkAndSendMorningMessage = () => {
  const now = new Date();
  const kievTimeZoneOffset = 3;

  if (now.getUTCHours() === 9 - kievTimeZoneOffset && now.getUTCMinutes() === 0) {
    sendMorningMessage();
  }
};

setInterval(checkAndSendMorningMessage, 60000);
