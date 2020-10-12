const fs = require('fs');
const puppeteer = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');


let finalFileList = [
  [
    'url', 
    'IP anon', 
    '3rd Party Requests', 
    '1st Party Cookies', 
    '3rd Party Cookies',
    '3rd Party Request List', 
    '1st Party Cookies List',
    '3rd Party Cookies List'
  ]
];


/**
  * Reads a list of URLs from a text file.
  *
  * @param {string} filePath - The file containing the URLs
  *
  * @returns {array} The list of URLs
*/
function parseUrls(filePath) {
  const data = fs.readFileSync(filePath, { encoding:'utf8' });
  
  // The filter is to efficiently ensure no empty strings are passed 
  // eg. empty newlines
  const urls = data.split('\n').filter(path => path.length);
  
  return urls;
}


/**
 * @description Writes data to a CSV filePath
 *
 * @param {string} filePath - The file being written
 * 
 */
function writeToCSV(data) {
  const filePath = "employee_file.csv";
  
  const writer = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'url', title: 'URL' }, 
      { id: 'aip', title:'IP anon' }, 
      { id: 'req3rdparty', title: '3rd Party Requests' }, 
      { id: 'cookies1stparty', title: '1st Party Cookies' }, 
      { id: 'cookies3rdparty', title: '3rd Party Cookies' },
      { id: 'req3rdpartylist', title: '3rd Party Requests List' }, 
      { id: 'cookies1stpartylist', title: '1st Party Cookies List' }, 
      { id: 'cookies3rdpartylist', title: '3rd Party Cookies List' }
    ],
  });

  writer.writeRecords(data)
    .then(() => {
      console.log(`[INFO] Data written to "${filePath}" successfully`)
    })
    .catch(error => {
      console.error(`[ERROR] Failed to write to "${filePath}"\n${error}`)
    });
}


/**
 * @description loads pages and gets required data using puppeteer
 *
 * @param {string} url - The url of the page to be parsed
 * @returns {array} The list of cookies & request data from the page
 */
async function parsePage(url, browser) {
  console.log(`[INFO] Parsing "${url}"...`);

  try {
    const page = await browser.newPage();

    const requests = [];
    let aip = "No GA found"; 

    page.on("request", async req => {
      const requestUrl = req.url();

      // get 3rd party scripts
      if(!requestUrl.includes('data:image/') && !requestUrl.includes(url)) {
        requests.push(requestUrl.slice(0, 200));
        if(requestUrl.includes('https://www.google-analytics.com/')) {
          aip = requestUrl.includes('aip=1') ? "Ano OK" : "Non Ano";
        }
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0' });

    const cookies1stParty = await page.cookies();
    // get all the domains for the 1st party cookies
    const domainMatch1stParty = cookies1stParty.map(cookie => cookie.domain);

    const { cookies: allCookies } = await page._client.send('Network.getAllCookies');
    const cookies3rdParty = allCookies.filter(
      cookie => (
        // filter out the cookies whose domains don't 
        // match any within the 1st party cookies
        !domainMatch1stParty.some(key => cookie.domain.includes(key))
      ));
 
    return {
      url, 
      aip, 
      req3rdparty: requests.length, 
      cookies1stparty: cookies1stParty.length,
      cookies3rdparty: cookies3rdParty.length,
      req3rdpartylist: formatList(requests),
      cookies1stpartylist: formatList(cookies1stParty),
      cookies3rdpartylist: formatList(cookies3rdParty)
    };
  } catch(error) { 
    console.log(`[ERROR]: Failure fetching ${url}:\n${error}`);
    return {
      url, 
      aip: "", 
      req3rdparty: "", 
      cookies1stparty: "",
      cookies3rdparty: "",
      req3rdpartylist: "",
      cookies1stpartylist: "",
      cookies3rdpartylist: ""
    };
  }
}


/**
 * @description formats data in a more readable format
 *
 * @param {array} arr - The list of items to be formatted
 * @returns {array} The formatted list
 */
function formatList(arr) {
  return arr.map((item, index) => {
    let formatted;
    
    if(!item) return;

    if(item instanceof Object) {
      formatted = (index === 0) ? 
        `- ${JSON.stringify(item)}` : 
        `\n- ${JSON.stringify(item)}`;
    } else {
      formatted = (index === 0) ? 
        `- ${item}` : 
        `\n- ${item}`;
    }

    return formatted;
  });
}


(async () => {
  const paths = parseUrls('./mock-urls.txt');

  try {
    const browser = await puppeteer.launch({
      /* enable 'executablePath' when the script fails to open the
       default browser executable */
      //executablePath: '/usr/bin/chromium' 
    });
    
    const promises = paths.map(path => parsePage(path, browser));
    
    Promise.all(promises)
      .then(async results => { 
        await browser.close();

        console.log("[INFO]: Finished Fetching Pages...");
        
        console.log("___Results___\n", results);

        writeToCSV(results);
      });
  } catch(error) {
    console.error(`[ERROR]: Failure running script\n${error}`);
  }
})();

