from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

# Set up Chrome options
chrome_options = Options()
# Load unpacked MetaMask extension
chrome_options.add_argument('--load-extension=/Users/lv/Library/Application Support/Google/Chrome/Default/Extensions/nkbihfbeogaeaoehlefnkodbefgpgknn')

# Initialize the driver with options
driver = webdriver.Chrome(options=chrome_options)

try:
    # Go to PancakeSwap
    driver.get("https://pancakeswap.finance/info/token/0xF6c5449B7E2AB7f732fbc1d2346e6F9CB9704867")
    
    # Wait for Connect Wallet button and click it
    connect_wallet = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Connect Wallet')]"))
    )
    connect_wallet.click()
    
    # Wait for wallet options and click MetaMask
    metamask_option = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'MetaMask')]"))
    )
    metamask_option.click()
    
    # Keep browser open for interaction
    time.sleep(60)

except Exception as e:
    print(f"An error occurred: {str(e)}")

finally:
    driver.quit()