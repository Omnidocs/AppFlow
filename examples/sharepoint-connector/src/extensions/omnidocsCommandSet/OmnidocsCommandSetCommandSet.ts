import { override } from '@microsoft/decorators';
import { BaseListViewCommandSet, IListViewCommandSetExecuteEventParameters } from '@microsoft/sp-listview-extensibility';

const LOG_SOURCE: string = 'OmnidocsCommandSet';

export default class OmnidocsCommandSet extends BaseListViewCommandSet<{ configurationURL: string }> {

    private popup: Window | null = null;
    private popupUrlOrigin: string = '';
    private popupFeatures: string = 'menubar=no,location=no,resizable=no,scrollbars=no,status=no,titlebar=no,toolbar=no,width=1200,height=800';

    @override
    public onInit(): Promise<void> {
        console.log(`${LOG_SOURCE} is initializing...`);
        return Promise.resolve();
    }

    @override
    public onExecute(event: IListViewCommandSetExecuteEventParameters): void {
        console.log(`${LOG_SOURCE} onExecute called. Opening Omnidocs popup...`);
        this.openOmnidocsPopup();
    }

    private async openOmnidocsPopup(): Promise<void> {
        const configurationURL = this.properties.configurationURL;
        const popupUrl = `${configurationURL}`;

        this.popupUrlOrigin = new URL(popupUrl).origin;
        this.popup = window.open(popupUrl, '_blank', this.popupFeatures);

        if (!this.popup) {
            console.error('Popup was not opened. Please ensure popups are allowed in your browser.');
            return;
        }

        console.log('Popup opened successfully. Popup URL:', popupUrl);
        console.log('Adding message listener for popup communications.');
        this.registerOmnidocsMessageHandler();
    }

    private registerOmnidocsMessageHandler(): void {
        const messageHandler = (message: MessageEvent) => {
            if (message.source !== this.popup) {
                console.log('Message received from an unknown source. Ignoring.');
                return;
            }

            console.log(`Message received from origin: ${message.origin}`);
            const messageData = message.data;

            console.log(`Message data received: ${JSON.stringify(messageData)}`);

            switch (messageData.eventType) {
                case 'omnidocs-init-request':
                    this.handleInitRequest(messageData);
                    break;

                case 'omnidocs-data-request':
                    this.handleDataRequest(messageData);
                    break;

                case 'omnidocs-deliver-request':
                    this.handleDeliveryRequest(messageData);
                    break;

                case 'omnidocs-preflight-request':
                    this.handlePreflightRequest(messageData);
                    break;

                case 'omnidocs-close-request':
                    this.popup?.close();
                    console.log('Received close request from Omnidocs. Popup closed.');
                    break;

                default:
                    console.warn(`Unhandled event type received: ${messageData.eventType}`);
            }
        };

        window.addEventListener('message', messageHandler, false);
        console.log('Message handler added.');
    }

    private handlePreflightRequest(messageData: any): void {
        console.log('Handling omnidocs-preflight-request...');
        const preflightResponse = {
            eventType: 'omnidocs-preflight-response',
            correlationId: messageData.correlationId,
            data: { getPdf: false } // Default to not requesting a PDF
        };

        console.log('Sending preflight response:', JSON.stringify(preflightResponse));
        this.popup?.postMessage(preflightResponse, this.popupUrlOrigin);
    }

    private handleInitRequest(messageData: any): void {
        console.log('Handling omnidocs-init-request...');
        const initResponse = {
            eventType: 'omnidocs-init-response',
            correlationId: messageData.correlationId,
            postMessageType: 'Document'
        };

        console.log('Sending init response:', JSON.stringify(initResponse));
        this.popup?.postMessage(initResponse, this.popupUrlOrigin);
    }

    private async handleDataRequest(messageData: any): Promise<void> {
        console.log('Handling omnidocs-data-request...');
        const sharepointData = await this.getSharePointData();
        const spLists = await this.getAllLists(); // Fetch all lists

        const dataResponse = {
            eventType: 'omnidocs-data-response',
            correlationId: messageData.correlationId,
            data: [
                {
                    key: 'spCurrentList',
                    value: {
                        title: sharepointData.currentList.title,
                        id: sharepointData.currentList.id,
                        url: sharepointData.currentList.url
                    }
                },
                {
                    key: 'spUserContext',
                    value: {
                        displayName: sharepointData.userContext.displayName,
                        email: sharepointData.userContext.email,
                        loginName: sharepointData.userContext.loginName
                    }
                },
                {
                    key: 'spLists',
                    value: spLists // Include all lists from the site
                }
            ]
        };

        setTimeout(() => {
            this.popup?.postMessage(dataResponse, this.popupUrlOrigin);
            console.log('Data response sent, including SharePoint data.');
        }, 1500);
    }

    private async getAllLists(): Promise<Array<{ id: string; title: string; url: string }>> {
        const listsUrl = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists?$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`;
        console.log('Fetching all lists from:', listsUrl);

        try {
            const response = await fetch(listsUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json;odata=verbose'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch lists from SharePoint site');
            }

            const data = await response.json();
            const lists = data.d.results.map((list: any) => ({
                id: list.Id,
                title: list.Title,
                url: list.RootFolder.ServerRelativeUrl
            }));

            return lists;
        } catch (error) {
            console.error('Error fetching lists:', error);
            return [];
        }
    }

    private async getSharePointData(): Promise<any> {
        const sharepointData: any = {
            currentList: {},
            userContext: {}
        };

        try {
            const listTitle = this.context.pageContext.list?.title || 'No list';
            const listId = this.context.pageContext.list?.id?.toString() || 'No ID';
            const listUrl = this.context.pageContext.list?.serverRelativeUrl || 'No URL';

            sharepointData.currentList = {
                title: listTitle,
                id: listId,
                url: listUrl
            };

            const userName = this.context.pageContext.user.displayName || 'Unknown User';
            const userEmail = this.context.pageContext.user.email || 'Unknown Email';
            const userLogin = this.context.pageContext.user.loginName || 'Unknown Login';

            sharepointData.userContext = {
                displayName: userName,
                email: userEmail,
                loginName: userLogin
            };

            console.log('User context:', sharepointData.userContext);
        } catch (error) {
            console.error('Error fetching SharePoint data:', error);
        }

        return sharepointData;
    }

    private async handleDeliveryRequest(messageData: any): Promise<void> {
        console.log('Handling omnidocs-deliver-request...');
        const documentUrl = messageData.data;
        console.log(`Document URL received: ${documentUrl}`);

        try {
            await this.downloadAndSaveDocumentToLibrary(documentUrl);
            console.log('Document successfully saved to SharePoint library.');

            // Send a "close" message to the popup, instructing it to close itself
            const closeResponse = {
                eventType: 'omnidocs-close-request',
                correlationId: messageData.correlationId
            };
            this.popup?.postMessage(closeResponse, this.popupUrlOrigin);
        } catch (error) {
            console.error('Error processing document:', error);
        }

        const deliverResponse = {
            eventType: 'omnidocs-deliver-response',
            correlationId: messageData.correlationId,
            id: messageData.id,
            documentType: messageData.documentType
        };

        console.log('Sending deliver response:', JSON.stringify(deliverResponse));
        this.popup?.postMessage(deliverResponse, this.popupUrlOrigin);

        // Ensure the popup is closed after delivering the response
        this.popup?.close();
        this.popup = null;  // Clear the reference
    }

    private async getCurrentFolderPath(): Promise<string> {
        const urlParams = new URLSearchParams(window.location.search);
        let folderPath = urlParams.get('id');

        // Default to the document library root if no specific folder is selected
        if (!folderPath) {
            console.log("No folder selected. Defaulting to document library root.");
            folderPath = this.context.pageContext.list?.serverRelativeUrl || '';
        }

        folderPath = decodeURIComponent(folderPath);
        console.log(`Extracted and encoded relative folder path: ${encodeURIComponent(folderPath)}`);
        return encodeURIComponent(folderPath);
    }

    private async uploadDocumentToLibrary(file: Blob, fileName: string): Promise<{ documentGuid: string; finalFileName: string }> {
        const requestDigest = await this.getRequestDigest();
        const folderPath = await this.getCurrentFolderPath();

        // Create a unique file name if the file already exists in the current folder
        const uniqueFileName = await this.getUniqueFileName(folderPath, fileName);
        const encodedFileName = encodeURIComponent(uniqueFileName);
        const uploadUrl = `${this.context.pageContext.web.absoluteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/files/add(url='${encodedFileName}',overwrite=false)`;

        console.log(`Uploading document to path: ${folderPath}. Upload URL: ${uploadUrl}`);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: file,
            headers: {
                'Accept': 'application/json;odata=verbose',
                'X-RequestDigest': requestDigest
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to upload document to SharePoint folder: ${folderPath}`);
        }

        const data = await response.json();
        const documentGuid = data.d.UniqueId; // Retrieve the Unique ID (GUID)

        console.log(`Document uploaded successfully. Document GUID: ${documentGuid}`);
        return { documentGuid, finalFileName: uniqueFileName };
    }

    private async downloadAndSaveDocumentToLibrary(documentUrl: string): Promise<void> {
        try {
            console.log(`Downloading document from URL: ${documentUrl}`);
            const response = await fetch(documentUrl);

            if (!response.ok) {
                throw new Error(`Failed to download document from ${documentUrl}`);
            }

            const blob = await response.blob();
            const fileName = this.extractFileName(documentUrl);

            console.log('Document downloaded successfully. File name:', fileName);

            const { documentGuid, finalFileName } = await this.uploadDocumentToLibrary(blob, fileName);

            console.log(`Opening document for editing with GUID: ${documentGuid} and Final File Name: ${finalFileName}`);

            this.openDocumentForEditing(documentGuid, finalFileName); // Open the document using the final name

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error downloading or saving document:', error);
        }
    }

    private openDocumentForEditing(documentGuid: string, uniqueFileName: string): void {
        const tenantName = this.context.pageContext.web.absoluteUrl.split('/')[2];
        const sitePath = this.context.pageContext.web.serverRelativeUrl;
        const fileType = uniqueFileName.split('.').pop()?.toLowerCase();

        let fileTypePath;
        if (fileType === 'docx') {
            fileTypePath = ":w:/r";
        } else if (fileType === 'xlsx') {
            fileTypePath = ":x:/r";
        } else if (fileType === 'pptx') {
            fileTypePath = ":p:/r";
        } else {
            console.warn(`Unsupported file type for editing: ${fileType}`);
            return;
        }

        const formattedGuid = `%7B${documentGuid.toUpperCase()}%7D`;
        const editUrl = `https://${tenantName}/${fileTypePath}${sitePath}/_layouts/15/Doc.aspx?sourcedoc=${formattedGuid}&file=${encodeURIComponent(uniqueFileName)}&action=edit`;

        const link = document.createElement('a');
        link.href = editUrl;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Opening document in edit mode: ${editUrl}`);
    }

    // Generate a unique file name if a file with the same name exists
    private async getUniqueFileName(folderPath: string, fileName: string): Promise<string> {
        const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
        const extension = fileName.split('.').pop();
        let uniqueFileName = fileName;
        let counter = 1;

        while (await this.fileExists(folderPath, uniqueFileName)) {
            uniqueFileName = `${baseFileName}${counter++}.${extension}`;
        }

        return uniqueFileName;
    }

    // Helper function to check if a file with the given name exists in the specified folder
    private async fileExists(folderPath: string, fileName: string): Promise<boolean> {
        const encodedFileName = encodeURIComponent(fileName);
        const checkUrl = `${this.context.pageContext.web.absoluteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/files('${encodedFileName}')`;

        const response = await fetch(checkUrl, {
            headers: { 'Accept': 'application/json;odata=verbose' }
        });

        return response.ok;
    }

    private async getRequestDigest(): Promise<string> {
        const contextInfoUrl = `${this.context.pageContext.web.absoluteUrl}/_api/contextinfo`;
        const response = await fetch(contextInfoUrl, { method: 'POST', headers: { 'Accept': 'application/json;odata=verbose' } });
        const data = await response.json();
        return data.d.GetContextWebInformation.FormDigestValue;
    }

    private extractFileName(documentUrl: string): string {
        const url = new URL(documentUrl);
        const params = new URLSearchParams(url.search);
        return params.get('fileName') || 'GeneratedDocument.docx';
    }
}