const axios = require('axios');
const xml2js = require('xml2js');
const { parseString } = xml2js;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('6309511831:AAHjqHMKMGzIewjKXeVSKH9ZB1G1DH9ydR4', { polling: true });

function replacePipeWithArrow(str) {
    return str.replace(/\|/g, ' > ');
  }

  function checkAvailableValue(value) {
    if (value === "") {
      return false;
    } else {
      return value;
    }
  }
// Функція для отримання XML-прайсу за посиланням
async function getXMLPrice(category) {
  try {
    const response = await axios.get('https://toysi.ua/feed-products-residue.php',{
    params: {
        vendor_code: 'prom',
        margin_import: 0.3,
        margin_ukr: 0.3, 
        price_from: 150,
        lang: 'ukr',
        assembly: true,
        cats: 'yes', 
        round: 'up',
        category: category, 
        key: 'a8181544a73dbb409474d90d52869122',
        out_of_stock: 7
      }});
    return response.data;
  } catch (error) {
    console.error('Помилка при отриманні XML: ', error);
    throw error;
  }
}

// Функція для перетворення XML в CSV
function convertXMLToCSV(xmlData) {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (error, result) => {
      if (error) {
        console.error('Помилка при парсингу XML: ', error);
        reject(error);
      } else {
        let csvData = [];
        
        const items = result.yml_catalog.shop[0].offers[0].offer;
        

        //Додати заголовки CSV
        csvData.push({
          name: 'NAME',
          vendorCode: 'SKU',
          picture: 'PIC',
          cats: 'CAT',
          description: 'DESC',
          ostatok: 'STOCK',
          keywords: 'KEYW',
          price: 'PRICE',
          categoryId: 'CAT_ID',
          available: 'available'
          // Додати інші необхідні поля
        });

        // Додати дані з XML до CSV
        items.forEach((item) => {
          csvData.push({
            vendorCode: item.vendorCode[0],
            name: item.name[0],
            picture: item.picture[0],
            cats: replacePipeWithArrow(item.cats[0]),
            description: item.description[0],
            ostatok: item.ostatok[0],
            keywords: item.keywords[0],
            price: item.price[0],
            categoryId: item.categoryId[0],
            available: checkAvailableValue(item['$'].available),
            // Додати значення інших полів з XML
          });
        });
        resolve(csvData);
      }
    });
  });
}

// Функція для збереження CSV-файлу
function saveCSVFile(data, filename) {
  const csvWriter = createCsvWriter({
    path: filename,
    header: Object.keys(data[0])
    //header: Object.keys(data[0]).map((key) => ({ id: key, title: data[0][key] })),
  });

  csvWriter
    .writeRecords(data)
    .then(() => console.log('CSV-файл успішно збережено.'))
    .catch((error) => console.error('Помилка при збереженні CSV-файлу: ', error));
}

// Основна функція для запуску додатку
async function run(category) {
  const xmlUrl = 'https://toysi.ua/feed-products-residue.php?vendor_code=prom&margin_import=0.3&margin_ukr=0.3&price_from=150&lang=ukr&assembly=true&cats=yes&round=up&category=99006&key=a8181544a73dbb409474d90d52869122';

  try {
    // Отримати XML-прайс
    const xmlData = await getXMLPrice(category);

    // Перетворити XML в CSV
    const csvData = await convertXMLToCSV(xmlData);

    // Зберегти CSV-файл
    saveCSVFile(csvData, 'price.csv');
  } catch (error) {
    console.error('Помилка: ', error);
  }
}



bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const filePath = './price.csv';
  if(msg.text === 'all') {
    await run(-51995);
    // Перевірка, чи існує файл price.csv
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Файл price.csv не знайдено!');
        return;
      }
      // Відправка файлу price.csv
      bot.sendDocument(chatId, filePath)
        .catch((error) => {
          bot.sendMessage(chatId, 'Виникла помилка під час відправлення файлу.');
          console.error(error);
      });
    });
  } else {
    await run(msg.text);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Файл price.csv не знайдено!');
        return;
      }
      // Відправка файлу price.csv
      bot.sendDocument(chatId, filePath)
        .catch((error) => {
          bot.sendMessage(chatId, 'Виникла помилка під час відправлення файлу.');
          console.error(error);
      });
    });
  }
});