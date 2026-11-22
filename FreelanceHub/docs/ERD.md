# FreelanceHub — Entity Relationship Diagram

```mermaid
erDiagram
  USER ||--o| WALLET : owns
  USER ||--o{ SESSION : opens
  USER ||--o{ PROJECT : publishes
  USER ||--o{ OFFER : submits
  USER ||--o{ DELIVERY : delivers
  USER ||--o{ NOTIFICATION : receives
  CATEGORY ||--o{ PROJECT : classifies
  PROJECT ||--o{ OFFER : receives
  PROJECT ||--o{ DELIVERY : has
  OFFER ||--o| PROJECT : "accepted for"
  OFFER ||--o{ DELIVERY : "fulfilled by"
  WALLET ||--o{ LEDGER_ENTRY : records

  USER {
    int id PK
    string name
    string email UK
    string passwordHash
    enum role
    enum status
    string bio
    string avatarUrl
    decimal hourlyRate
    datetime createdAt
    datetime updatedAt
  }
  SESSION {
    string id PK
    int userId FK
    string refreshTokenHash
    string userAgent
    string ipAddress
    datetime expiresAt
    datetime revokedAt
    datetime createdAt
  }
  CATEGORY {
    int id PK
    string name UK
    string slug UK
    string description
    boolean isActive
    datetime createdAt
    datetime updatedAt
  }
  PROJECT {
    int id PK
    int clientId FK
    int categoryId FK
    string title
    text description
    decimal budget
    string attachmentUrl
    enum status
    datetime createdAt
    datetime updatedAt
  }
  OFFER {
    int id PK
    int projectId FK
    int freelancerId FK
    decimal price
    int durationDays
    string message
    enum status
    int acceptedForProjectId UK
    datetime createdAt
    datetime updatedAt
  }
  WALLET {
    int id PK
    int userId FK_UK
    decimal balance
    decimal escrow
    string currency
    datetime createdAt
    datetime updatedAt
  }
  LEDGER_ENTRY {
    int id PK
    int walletId FK
    enum type
    decimal amount
    decimal balanceAfter
    decimal escrowAfter
    string reference
    string description
    datetime createdAt
  }
  DELIVERY {
    int id PK
    int projectId FK
    int offerId FK
    int freelancerId FK
    string fileUrl
    string note
    enum status
    datetime createdAt
    datetime reviewedAt
  }
  NOTIFICATION {
    int id PK
    int userId FK
    string title
    string body
    json data
    datetime readAt
    datetime createdAt
  }
```

## Relationship notes

- One user owns at most one wallet; each wallet belongs to one user.
- One client can publish many projects; every project belongs to one client.
- Each project belongs to one category; a category can classify many projects.
- One freelancer can submit many offers, but the unique key `(projectId, freelancerId)` allows only one offer per freelancer per project.
- An offer may be accepted for at most one project; the accepted offer is linked through `Project.acceptedOffer`.
- Each project may have multiple delivery submissions over its lifecycle.
- Wallet entries are append-only audit records for top-ups, escrow holds, escrow releases, platform fees and refunds.
- Sessions belong to users and store only a hash of the refresh token.
