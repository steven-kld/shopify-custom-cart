function doPost(e) {
    try {
      const data = JSON.parse(e.postData.contents);
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/1rZZx7s1QjSfzeIz0d3iEOM5hF-kQuIXDcIRFrTanGJk/edit?gid=0#gid=0'; 
      const spreadsheet = SpreadsheetApp.openByUrl(sheetUrl);
      const sheet = spreadsheet.getActiveSheet();
      
      // Get the custom fields from the payload
      const customFields = data.custom_fields;
      
      // Extract the new fields
      const fullName = customFields.full_name;
      const address = customFields.address;
      const phone = customFields.phone;
      const email = customFields.email;
      const date = customFields.date;
      
      // Log the custom fields in a single row
      sheet.appendRow([
        new Date(),
        fullName,
        address,
        phone,
        email,
        date
      ]);
      
      // Log cart contents
      const cartItems = data.cart_contents.items.map(item => `${item.title} (${item.quantity})`);
      sheet.appendRow([
        "Cart Items:",
        cartItems.join(', '),
        data.cart_contents.total_price / 100
      ]);
      
      const query = createQuery(
        email,
        phone,
        fullName,
        date,
        address,
        cartItems.join(', '),
        data.cart_contents.total_price / 100
      );
  
      runQuery(query);
      // Return a success response (optional in no-cors mode)
      const responseData = { status: "success", message: "Data received successfully!" };
      const response = ContentService.newTextOutput(JSON.stringify(responseData))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*'
        });
        
      return response;
  
    } catch (err) {
      // Handle errors
      const errorResponseData = { status: "error", message: err.message };
      const errorResponse = ContentService.newTextOutput(JSON.stringify(errorResponseData))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*'
        });
        
      return errorResponse;
    }
  }
  
  const PROJECT_ID = "florissimo-378500"
  const QUERY_BASE = "INSERT INTO `florissimo-378500.main.orders` "
  
  function test() {
    const query = createQuery(
      "stepa@test.ge",
      "987654321",
      "Stepa Kolodiazhniy",
      "2025-10-02",
      "Antonio Bellet 90",
      "Ramo pequeño rosado - Ramo mini (1), my-test-product (1)",
      15000
    );
  
    runQuery(query);
  }
  
  function getCurrentDateTimeString() {
    const now = new Date();
    
    // Get date components
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
  
    // Get time components
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
  
    // Combine and format
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  function createLocalId() {
    const randomNumber = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    return `C-${new Date().getHours()+new Date().getMinutes()}-${randomNumber}`
  }
  
  function parseFullName(fullName) {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
  
    return {
      firstName: firstName,
      lastName: lastName
    };
  }
  
  // CREATE QUERY
  function createQuery(client_email, client_phone, client_full_name, order_delivery_date, order_address, order_products, order_price) {
    const parsed_full_name = parseFullName(client_full_name);
    let client_first_name = parsed_full_name.firstName;
    let client_last_name = parsed_full_name.lastName;
    const last_local_id = 0;
    let order_search_id = createLocalId();
    
    let query_values = `VALUES (
      GENERATE_UUID(),
      CURRENT_TIMESTAMP(),
      "",
      "",
      "${client_email}",
      "${client_phone}",
      "${client_first_name}",
      "${client_last_name}",
      "web",
      CAST("${getCurrentDateTimeString()}" AS DATETIME),
      CAST("${order_delivery_date}" AS DATE),
      "00:00",
      "${order_address}",
      "",
      "${order_products}",
      ${order_price},
      0,
      false,
      "new",
      "",
      "",
      "",
      '',
      "",
      "Custom Shopify",
      "",
      ${last_local_id},
      "${order_search_id}"
    )`
    
    return {
      query: QUERY_BASE + query_values,
      // info: createInfoFromOrder(order, order_search_id, is_express)
    }
  }
  
  // RUN QUERY
  function runQuery(queryObject) {
    const request = {
      // We are now accessing the 'query' property of the object
      query: queryObject.query, 
      useLegacySql: false
    };
    let queryResults = BigQuery.Jobs.query(request, PROJECT_ID);
    const jobId = queryResults.jobReference.jobId;
  
    // Check on status of the Query Job.
    let sleepTimeMs = 500;
    while (!queryResults.jobComplete) {
      Utilities.sleep(sleepTimeMs);
      sleepTimeMs *= 2;
      queryResults = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId);
    }
  }
  