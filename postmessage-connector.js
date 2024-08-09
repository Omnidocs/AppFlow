// Required Client responses
const initResponse = {
  eventType: 'omnidocs-init-response',
  correlationId: '4B8C1909-9B9E-4EE3-AC1B-6FDB4C5A2C42',
  postMessageType: 'Document'
};

const dataResponse = {
  eventType: 'omnidocs-data-response',
  data: [{ 'formkey': 'formValue' }, { 'formkey2': 'formValue2' }] // Optional 
};

const deliverResponse = {
  eventType: 'omnidocs-deliver-response'
};

// Omnidocs requests
const initRequest = {
  eventType: 'omnidocs-init-request',
  correlationId: '4B8C1909-9B9E-4EE3-AC1B-6FDB4C5A2C42',
};

const dataRequest = {
  eventType: 'omnidocs-data-request',
  id: '66a0b249d24875aa6326228c',
  correlationId: '4B8C1909-9B9E-4EE3-AC1B-6FDB4C5A2C42',
  formContext: 'Initial', // or AdditionalForm
  data: ['formkey', 'formkey2']
};

const deliveryRequest = {
  eventType: 'omnidocs-delivery-request',
  id: '66a0b249d24875aa6326228c',
  correlationId: '4B8C1909-9B9E-4EE3-AC1B-6FDB4C5A2C42',
  documentType: 'Document', // or Element 
  data: 'DownloadUrl'
};

const closeRequest = {
  eventType: 'omnidocs-close-request',
  correlationId: '4B8C1909-9B9E-4EE3-AC1B-6FDB4C5A2C42',
};

const omnidocsPostMessageModule = (function () {
  const popupNotOpenedError ='Popup was not opened, make sure this function is run from a click action.';
  const features ='menubar=no,location=no,resizable=no,scrollbars=no,status=no,titlebar=no,toolbar=no,width=1500,height=1000';

  let popup;
  let popUrlOrigin;

  function registerOmnidocsMessageHandler(
    popup,
    popupUrl,
    resolveDocumentUrl,
    signal
  ) {
    window.addEventListener(
      'message',
      (message) => {
        if (message.source.self !== popup) {
          return;
        }

        const messageData = message.data;

        if (messageData.eventType === 'omnidocs-init-request') {
          let initRequest = getInitRequest(messageData);
          let initResponse = createInitResponse(initRequest)

          popup.postMessage(initResponse, popupUrl.origin);
        }
        if (messageData.eventType === 'omnidocs-data-request') {
          let dataRequest = getDataRequest(messageData);
          displayDataRequest(dataRequest);
        }

        if (messageData.eventType === 'omnidocs-deliver-request') {
          let deliverRequest = getDeliverRequest(messageData);
          resolveDocumentUrl(deliverRequest.data);

          let deliverResponse = createDeliverResponse();
          popup.postMessage(deliverResponse, popupUrl.origin);
        }

        if (messageData.eventType === 'omnidocs-close-request') {
          let closeRequest = getCloseRequest(messageData);
          popup.close();
        }
      },
      { signal: signal }
    );
  }

  function getInitRequest(messageData) {
    initRequest.eventType = messageData.eventType;
    initRequest.correlationId = messageData.correlationId;
    
    return initRequest;
  }

  function createInitResponse(initRequest) {
    initResponse.eventType = 'omnidocs-init-response';
    initResponse.correlationId = initRequest.correlationId;
    initResponse.postMessageType = 'Document';

    return initResponse;
  } 

  function getDataRequest(messageData) {
    dataRequest.eventType = messageData.eventType;
    dataRequest.id = messageData.id;
    dataRequest.correlationId = messageData.correlationId;
    dataRequest.formContext = messageData.formContext;
    dataRequest.data = messageData.data;

    return dataRequest;
  }

  function sendDataResponse(responseData) {
    let dataResponse = createDataResponse(responseData);
    popup.postMessage(dataResponse, popUrlOrigin);
  }

  function createDataResponse(responseData) {
    dataResponse.eventType = 'omnidocs-data-response';
    dataResponse.data = JSON.parse(responseData);

    return dataResponse;
  }

  function getDeliverRequest(messageData) {
    deliveryRequest.eventType = messageData.eventType;
    deliveryRequest.id = messageData.id;
    deliveryRequest.correlationId = messageData.correlationId;
    deliveryRequest.documentType = messageData.documentType;
    deliveryRequest.data = messageData.data;

    return deliveryRequest;
  }

  function createDeliverResponse(){
    initResponse.eventType = 'omnidocs-deliver-response';

    return initResponse;
  }

  function getCloseRequest(messageData) {
    closeRequest.eventType = messageData.eventType;
    closeRequest.correlationId = messageData.correlationId;

    return closeRequest;
  }

  function openPopup(url, abortController) {
    const openedPopup = window.open(url, '_blank', features);
    popup = openedPopup;

    if (!openedPopup) {
      abortController.abort(popupNotOpenedError);
      throw new Error(popupNotOpenedError);
    }

    const interval = setInterval(() => {
      if (openedPopup.closed) {
        abortController.abort('popup was closed');
        clearInterval(interval);
      }
    }, 200);

    return openedPopup;
  }

  function getDocumentUrl(popupUrl) {
    const abortController = new AbortController();
    let url = new URL(popupUrl);
    popUrlOrigin = url.origin;

    let resolveDocumentUrl;

    const documentUrlPromise = new Promise((resolve, reject) => {
      resolveDocumentUrl = resolve;
      abortController.signal.addEventListener('abort', (e) =>
        reject(e.currentTarget.reason)
      );
    });

    popup = openPopup(url, abortController);

    registerOmnidocsMessageHandler(
      popup,
      url,
      resolveDocumentUrl,
      abortController.signal
    );

    return documentUrlPromise;
  }

  // UI Data Display and Countdown handling section
  let countdown;

  const countDownSeconds = 30;
  const timerElement = document.getElementById('timer');
  const dataReponseBtn = document.getElementById('send-data-response-button');
  const dataIdElement = document.getElementById('data-id');
  const formDataContextElement = document.getElementById('form-data-context');
  const responseDataElement = document.getElementById("response-data")

  function displayDataRequest(dataRequest){
    resetDataFlow();
    resetCountdown();
    startCountdown();

    dataIdElement.textContent = dataRequest.id;
    formDataContextElement.textContent = dataRequest.formContext;
  
    displayFormKeyValueForDataResponse(dataRequest);
  }

  function resetDataFlow() {
    dataIdElement.textContent = '';
    formDataContextElement.textContent = '';
    timerElement.textContent = '';
    dataReponseBtn.disabled = false;
  }

  function resetCountdown() {
    clearInterval(countdown);
    timerElement.textContent = countDownSeconds;
  }

  function startCountdown() {
    clearInterval(countdown);
    let timer = countDownSeconds, seconds;
    countdown = setInterval(function () {
      seconds = parseInt(timer % 60, 10);
      timerElement.textContent = seconds;

      if (--timer < 0) {
        clearInterval(countdown);
        dataReponseBtn.disabled = true;
      }
    }, 1000);
  } 
  
  function displayFormKeyValueForDataResponse(dataRequest){
    let formKeyValue = dataRequest.data.map((key) => ({
      key: key, 
      value: ""
    }));
   
    responseDataElement.value = JSON.stringify(formKeyValue);
  }

  return { getDocumentUrl, sendDataResponse };
})();