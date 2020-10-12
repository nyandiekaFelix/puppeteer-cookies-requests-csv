import asyncio
from pyppeteer import launch
from pyppeteer.network_manager import NetworkManager
import time
import csv
 
 
final_file_list = [['url', 'IP anon', 'Count Reqs', 'Count Cookies', 'Reqs List', 'Cookies List']]
 
#ouvre le fichier txt
file = open("mock-urls.txt", "r") 
 
url_list = file.readlines()
 
file.close()
 
clean_url_list = []
 
for i in url_list:
    clean_url_list.append(i.rstrip("\n"))
 
for url in clean_url_list:
 
    cookies_listing = []
    request_listing = []
    aip = "No GA found"
 
    request_clean = []
 
    def logit(event):
        req = event._request
        #print("{0} - {1}".format(req.url, event._status))
        request_listing.append(req.url)
 
    async def main():
        browser = await launch({"headless": True })
        page = await browser.newPage()
        page._networkManager.on(NetworkManager.Events.Response, logit)
        await page.goto(url, {'waitUntil' : 'networkidle0'})
 
        cookies = await page.cookies()
        for i in cookies:
            cookies_listing.append(i)
            print(i)
        await browser.close()
 
 
    asyncio.get_event_loop().run_until_complete(main())
 
    #get 3rd party script
    for cl in request_listing:
        if url not in cl:
            if 'data:image/' not in cl:
                request_clean.append(cl[0:200])
                if 'https://www.google-analytics.com/' in cl:
                    if 'aip=1' in cl:
                        aip = "Ano OK"
                    else:
                        aip = "Non Ano"
 
 
    final_file_list.append([url, aip, str(len(request_clean)), str(len(cookies_listing)), request_clean, cookies_listing])
 
    print("%s" % url)
 
 
with open('employee_file.csv', mode='w') as employee_file:
    employee_writer = csv.writer(employee_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
 
    for ecrit in final_file_list:
 
        employee_writer.writerow(ecrit)
 
##TODO
