# ALLGO — PHASE 2 API CONTRACT & SPECIFICATION CHANGES
## REST Endpoints, Payloads, Headers and Error Codes

**Project:** AllGo — India Super App  
**Workspace:** `E:\allgo`  
**Date:** 2026-11-10  
**Phase:** 2 — Partner & Merchant Onboarding, KYC, Private Storage and Administration  

---

## 1. PRIVATE DOCUMENT STORAGE API (`/v1/storage`)

### 1.1 Pre-Allocate Upload Ticket
- **Method & Route:** `POST /v1/storage/upload-ticket`
- **Auth:** Partner, Merchant, or Admin JWT (`Bearer <token>`)
- **Rate Limit:** 30 requests / 15 minutes per user
- **Request Body:**
  ```json
  {
    "documentType": "DRIVING_LICENSE",
    "mimeType": "application/pdf",
    "fileSizeBytes": 2097152
  }
  ```
- **Validation Constraints:**
  - `mimeType`: Must be one of `application/pdf`, `image/jpeg`, `image/png`.
  - `fileSizeBytes`: Must be between 1 and 5,242,880 bytes (5 MB max).
- **Response (`201 Created`):**
  ```json
  {
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "uploadUrl": "/v1/storage/upload/3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "expiresAt": "2026-11-10T14:45:00.000Z",
    "maxSizeBytes": 5242880
  }
  ```

### 1.2 Binary File Upload
- **Method & Route:** `PUT /v1/storage/upload/:ticketId`
- **Auth:** Partner or Merchant JWT (must match `ticket.user_id`)
- **Headers:** `Content-Type: application/octet-stream` (or matched image/pdf MIME)
- **Request Body:** Raw binary file stream (buffer)
- **Enforcements:**
  - Ticket must exist and have status `TICKET_CREATED`.
  - Ownership check: Session user ID must strictly equal `ticket.user_id` (IDOR defense).
  - Magic byte and structural marker validation (PDF `%PDF`/`%%EOF`, PNG header/`IEND`, JPEG `SOI`/`EOI`).
  - ClamAV antivirus inspection.
- **Response (`200 OK`):**
  ```json
  {
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fileHashSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "UPLOADED",
    "fileSizeBytes": 2048576
  }
  ```

### 1.3 Authenticated Document Streaming
- **Method & Route:** `GET /v1/storage/documents/:ticketId`
- **Auth:** Partner or Merchant JWT (owner only) OR Admin JWT (`X-AllGo-Role: ADMIN` / `SUPER_ADMIN`)
- **Response (`200 OK`):** Binary stream with `Content-Type` matching the verified MIME type and `Content-Disposition: inline`.
- **Error Codes:**
  - `401 Unauthorized`: Missing or invalid JWT.
  - `403 Forbidden`: Requesting user is neither document owner nor platform administrator.
  - `404 Not Found`: Ticket not found or binary file unlinked/expired.

---

## 2. PARTNER MOBILE ONBOARDING API (`/v1/partner`)

### 2.1 Register Partner Profile
- **Method & Route:** `POST /v1/partner/register`
- **Auth:** Partner JWT
- **Request Body:**
  ```json
  {
    "vehicleType": "MOTORCYCLE",
    "registrationNumber": "TN01AB1234",
    "makeModel": "Hero Splendor Plus",
    "bankAccountNumber": "50100123456789",
    "bankIfsc": "HDFC0001234",
    "bankBeneficiaryName": "Ramesh Kumar"
  }
  ```
- **Validation Constraints:**
  - `vehicleType`: Enum (`BICYCLE`, `MOTORCYCLE`, `SCOOTER`, `AUTO_RICKSHAW`, `HATCHBACK`, `SEDAN`, `SUV`, `TRUCK`).
  - Bank Account & IFSC: Encrypted with AES-256-GCM; blind index computed via HMAC-SHA256.
  - Aadhaar minimization: Any 12-digit sequence passed in any field is rejected immediately.
- **Response (`201 Created`):**
  ```json
  {
    "id": "prt_88234857-418b-49ef-9a57-123456789abc",
    "userId": "usr_77123456",
    "vehicleType": "MOTORCYCLE",
    "registrationNumber": "TN01AB1234",
    "makeModel": "Hero Splendor Plus",
    "bankAccountMasked": "******6789",
    "status": "REGISTERED",
    "createdAt": "2026-11-10T13:30:00.000Z"
  }
  ```

### 2.2 Apply for Service Category
- **Method & Route:** `POST /v1/partner/services`
- **Auth:** Partner JWT
- **Request Body:**
  ```json
  {
    "serviceCategory": "FOOD_DELIVERY"
  }
  ```
- **Enforcements:**
  - Verifies partner vehicle is compatible with `serviceCategory` per `partner-service-eligibility.json`.
  - Creates independent service application record initialized to `PENDING`.
- **Response (`201 Created`):**
  ```json
  {
    "serviceCategory": "FOOD_DELIVERY",
    "status": "PENDING",
    "appliedAt": "2026-11-10T13:30:00.000Z"
  }
  ```

### 2.3 Submit Partner KYC Document
- **Method & Route:** `POST /v1/partner/documents`
- **Auth:** Partner JWT
- **Request Body:**
  ```json
  {
    "documentType": "DRIVING_LICENSE",
    "documentNumber": "TN0120200001234",
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "expiryDate": "2035-12-31"
  }
  ```
- **Versioning Behavior:**
  - If a current document exists for this `documentType`, it is marked `is_current = false` and its `superseded_by` pointer is updated to the new document ID.
  - New document is created with `version = previous_version + 1` and `is_current = true`.
- **Response (`201 Created`):**
  ```json
  {
    "id": "doc_99123456",
    "documentType": "DRIVING_LICENSE",
    "version": 1,
    "isCurrent": true,
    "status": "SUBMITTED"
  }
  ```

### 2.4 Submit Dossier for Review
- **Method & Route:** `POST /v1/partner/submit`
- **Auth:** Partner JWT
- **Enforcements:** Verifies mandatory documents (`DRIVING_LICENSE`, `VEHICLE_RC`, `VEHICLE_INSURANCE`) have been provided.
- **Response (`200 OK`):**
  ```json
  {
    "status": "DOCS_SUBMITTED",
    "message": "Partner dossier submitted for admin verification"
  }
  ```

### 2.5 Get Partner Profile & Status
- **Method & Route:** `GET /v1/partner/profile`
- **Auth:** Partner JWT
- **Response (`200 OK`):** Includes masked bank account, partner account status, and array of service categories with independent approval states.

---

## 3. MERCHANT MOBILE & OUTLET MANAGEMENT API (`/v1/merchants`)

### 3.1 Submit Merchant KYC Document
- **Method & Route:** `POST /v1/merchants/documents`
- **Auth:** Merchant JWT
- **Request Body:**
  ```json
  {
    "documentType": "FSSAI_LICENSE",
    "documentNumber": "12423001001234",
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "expiryDate": "2028-06-30"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": "mdoc_44123456",
    "documentType": "FSSAI_LICENSE",
    "version": 1,
    "isCurrent": true,
    "verificationStatus": "PENDING"
  }
  ```

### 3.2 Create Secondary Outlet Branch
- **Method & Route:** `POST /v1/merchants/outlets`
- **Auth:** Merchant JWT
- **Request Body:**
  ```json
  {
    "outletName": "A2B Sweets - Velachery Branch",
    "addressLine1": "No 45 Bypass Road, Velachery",
    "postalCode": "600042",
    "latitude": 12.9815,
    "longitude": 80.2180,
    "phone": "+919876543210"
  }
  ```
- **Enforcements:**
  - Automatically created in `outlet_status: 'PENDING_APPROVAL'`.
  - `is_open` is hard-locked to `false` until administrative verification.
- **Response (`201 Created`):** Returns outlet record with `outlet_status: 'PENDING_APPROVAL'`.

### 3.3 List Merchant Outlets
- **Method & Route:** `GET /v1/merchants/outlets`
- **Auth:** Merchant JWT
- **Response (`200 OK`):** Returns all registered outlets with their independent `outlet_status` and `is_open` state.

---

## 4. ADMIN COMPLIANCE & APPROVAL API (`/v1/admin`)

### 4.1 List Partner Applications Queue
- **Method & Route:** `GET /v1/admin/partners`
- **Auth:** Admin JWT (`X-AllGo-Role: ADMIN` / `SUPER_ADMIN`)
- **Query Parameters:** `status` (optional filter: `ALL`, `DOCS_SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `DOCUMENTS_REQUIRED`, `REJECTED`)
- **Response (`200 OK`):** Array of partner summaries with submission dates and requested service counts.

### 4.2 Partner Dossier Detail
- **Method & Route:** `GET /v1/admin/partners/:id`
- **Auth:** Admin JWT
- **Response (`200 OK`):** Full dossier including vehicle specifications, masked bank payout details, all submitted KYC documents with direct download links, and independent service application states.

### 4.3 Update Partner Account Status
- **Method & Route:** `PATCH /v1/admin/partners/:id/status`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "reason": "Complete physical verification and background clearance obtained"
  }
  ```
- **Validation:** `reason` is strictly mandatory. Emits append-only record in `audit_logs`.

### 4.4 Update Independent Service Category Status
- **Method & Route:** `PATCH /v1/admin/partners/:id/services/:serviceCategory`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "reason": "Vehicle inspection verified motorcycle meets commercial food delivery requirements"
  }
  ```
- **Enforcements:** Updates ONLY the specified service category. Does not alter other services.

### 4.5 Update Merchant Secondary Outlet Status
- **Method & Route:** `PATCH /v1/admin/merchants/outlets/:outletId/status`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "status": "ACTIVE",
    "reason": "Secondary branch premises inspection and fire safety certificate verified"
  }
  ```
- **Effects:** If set to `ACTIVE`, sets `is_open = true`. If set to `SUSPENDED` or `REJECTED`, forces `is_open = false`.
