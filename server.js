const express = require('express');
const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');
const cors = require('cors');

const server = express();

server.use(cors())

server.get('/', async (req, res) => {
  const { start, end } = req.query;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://lojas.queroquero.com.br/');
  await page.exposeFunction("getSubPage", getSubPage);

  const pageContent = await page.evaluate(async (start, end) => {
    let stores = [];

    const storeComponent = document.querySelector('.lista_lojas');
    const storesList = storeComponent.children;

    for (let i = start; i <= end; i++) {
      const storeCard = storesList[i].querySelector('.blog-post');
      const storeInfo = storeCard.querySelector('.data');
      const storeName = storeInfo.getElementsByTagName('h4')[0].innerHTML;
      const storeAddress = storeInfo.getElementsByTagName('div')[0].innerHTML;
      const storePhone = storeCard.getElementsByClassName('btns')[0].getElementsByTagName('a')[0].href.split(':')[1]; 
      const storeLink = storeCard.getElementsByClassName('btns')[2].getElementsByTagName('div')[0].getElementsByTagName('a')[0].href

      const workingHours = await getSubPage(storeLink);

      stores.push({
        Id: i,
        Unidade: storeName,
        Endereco: storeAddress,
        Telefone: storePhone,
        Link: storeLink,
        'Horario de Atendimento': workingHours
      });
    }

    return stores;
  }, start, end);

  await browser.close();

  const csv = new ObjectsToCsv(pageContent);
  await csv.toDisk('./csv/file.csv');

  return res.download("./csv/file.csv");
})

async function getSubPage(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const pageContent = await page.evaluate(() => {
    const workinHours = document.querySelector('.schedule-list')
      let objectWorkingHours = {};
      let workingHoursString = '';
 
      for(let i = 0; i < workinHours.childElementCount; i+=2) {
        const dayName = workinHours.children[i].children[0].children[0].innerText;
        const firstWorkingHour = workinHours.children[i].children[0].children[1].innerText;

        let secondWorkingHours = '';

        if (i === 0) {
          const secondWorkingHour = workinHours.children[i+1].children[0].children[1].innerText;
          secondWorkingHours = secondWorkingHour;
          objectWorkingHours[dayName] = {open: firstWorkingHour, close: secondWorkingHour}
        } else {
          const secondWorkingHour = workinHours.children[i-1].children[0].children[1].innerText;
          secondWorkingHours = secondWorkingHour;
          objectWorkingHours[dayName] = {open: firstWorkingHour, close: secondWorkingHour}
        }

        workingHoursString += `${dayName} (${firstWorkingHour} | ${secondWorkingHours}) \n`;
      }

      return workingHoursString;
  });

  await browser.close();

  return pageContent;
}

server.listen(3005);