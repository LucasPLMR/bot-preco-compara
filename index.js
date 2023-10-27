const { Firestore } = require('@google-cloud/firestore');
const { Builder, By, until } = require('selenium-webdriver');
const { elementsLocated } = require('selenium-webdriver/lib/until');

require('chromedriver');

// Configurando o Firestore
const firestore = new Firestore({
  projectId: 'kingsmens-a073a',
  keyFilename: 'serviceAccountKey.json'
});

// Função para extrair números decimais de uma string
function extractDecimalsFromString(str) {
  return str.match(/\d+(\.\d+)?/g).map(Number);
}

// Obter todos os produtos do Firestore
async function getAllProductsFromFirestore() {
  const productsRef = firestore.collection('produtos');
  const snapshot = await productsRef.get();
  const products = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const precos = extractDecimalsFromString(data.preco);

    if (precos.length > 0) {
      products.push({
        nome: data.nome,
        descricao: data.descricao,
        precos: precos
      });
    }
  });

  return products;
}
  

// Usar o Selenium para digitar o nome do produto nas Lojas Americanas
async function searchProductOnAmericanas(produtos) {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('https://br.tommy.com/');
    await driver.wait(until.elementLocated(By.xpath('/html/body/section[3]/div/div/span')), 10000).click()
    const inputPesquisa = await driver.wait(until.elementLocated(By.xpath('//*[@id="searchtyped"]')), 10000);
    await inputPesquisa.sendKeys(produtos.nome);
    await inputPesquisa.submit();
    await driver.sleep(1000);
  
    const comparaPrecoElement = await driver.wait(until.elementLocated(By.xpath("(//span[contains(text(), 'R$') and contains(@class, 'best-price')])[02]")), 10000);
    const comparaPrecoText = await comparaPrecoElement.getText();
    const valorLimpo = comparaPrecoText.replace(/[^0-9]/g, ''); // Remove todos os caracteres que não são dígitos
    const valorSemDoisUltimosCaracteres = valorLimpo.slice(0, -2); // Remove os dois últimos caracteres
    console.log(valorSemDoisUltimosCaracteres); // Isso irá imprimir "4500"
    

    if (valorSemDoisUltimosCaracteres < produtos.preco) {
      console.log("Mais barato que no banco");
    // await driver.wait(until.elementLocated(By.xpath('//*[@id="listing"]/div[3]/div/div/div[2]/div[1]/main/div[1]/a')), 10000).click()
    // // Aguarde alguns segundos para ver o resultado, ajuste conforme necessário
    // const verificaPreco = await driver.wait(until.elementLocated(By.xpath('//*[@id="listing"]/div[3]/div/div/div[2]/div[1]/main/div[1]/a/div/div[2]/div[2]/span[2]')), 10000).getText()
    
    // if(verificaPreco < produtos.preco){
    //   await driver.wait(until.elementLocated(By.xpath('//*[@id="blocoValores"]/div[2]/div[2]/button')), 10000).click()
    // }
    // await driver.wait(until.elementLocated(By.xpath('//*[@id="__next"]/div[1]/div[2]/div/div[2]/div/div[3]/div/button[2]')), 10000).click()
    // await driver.wait(until.elementLocated(By.xpath('//*[@id="buttonGoToPayment"]')), 10000).click()

  }else{
    console.log("Mais caro que no banco")
  }
  await driver.sleep(3000);
 } finally {
    await driver.quit();
  }
}

(async () => {
  const products = await getAllProductsFromFirestore();
  if (products && products.length > 0) {
    for (const product of products) {
      await searchProductOnAmericanas(product);
    }
  } else {
    console.log('Não foram encontrados produtos no Firestore.');
  }
})();
