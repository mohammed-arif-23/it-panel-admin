# MongoDB Atlas Setup Guide

## 🚀 Quick Setup Instructions

### 1. Create MongoDB Atlas Account
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 free tier is sufficient for development)

### 2. Database Configuration

#### Create Database and Collection
```javascript
// In MongoDB Atlas console, create:
Database: college_results
Collection: semester_result_sheets
```

#### Sample Document Structure
```javascript
{
  "_id": ObjectId("..."),
  "sheet_id": 1,
  "department": "B.Tech. Information Technology",
  "year": 1,
  "semester": 1,
  "batch": "2023-2027",
  "exam_cycle": "NOV/DEC 2024",
  "result_data": [
    {
      "stu_reg_no": "620124205001",
      "stu_name": "AADHISWAR R",
      "res_data": {
        "BS3171": "A+",
        "CY3151": "B",
        "GE3151": "A",
        "GE3171": "O",
        "HS3151": "B+",
        "MA3151": "A"
      }
    }
  ]
}
```

### 3. Connection String Setup

#### Get Connection String
1. In Atlas, go to "Database" → "Connect"
2. Choose "Connect your application"
3. Copy the connection string

#### Update .env.local
```bash
# Replace username, password, and cluster URL
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/college_results?retryWrites=true&w=majority
DB_NAME=college_results
```

### 4. Network Access Configuration

#### Add IP Whitelist
1. Go to "Network Access" in Atlas
2. Click "Add IP Address"
3. Add your current IP address
4. For development, you can add `0.0.0.0/0` (not recommended for production)

#### Database User Creation
1. Go to "Database Access"
2. Click "Add New Database User"
3. Create a username and strong password
4. Assign "Read and Write to any database" role

### 5. Indexes for Performance

#### Create Indexes
```javascript
// Run these in MongoDB Atlas console
db.semester_result_sheets.createIndex({ "batch": 1, "department": 1, "year": 1, "semester": 1 })
db.semester_result_sheets.createIndex({ "result_data.stu_reg_no": 1 })
db.semester_result_sheets.createIndex({ "sheet_id": 1 })
```

### 6. Sample Data Insertion

#### Insert Sample Data
```javascript
db.semester_result_sheets.insertOne({
  sheet_id: 1,
  department: "B.Tech. Information Technology",
  year: 1,
  semester: 1,
  batch: "2023-2027",
  exam_cycle: "NOV/DEC 2024",
  result_data: [
    {
      stu_reg_no: "620124205001",
      stu_name: "AADHISWAR R",
      res_data: {
        "BS3171": "A+",
        "CY3151": "B",
        "GE3151": "A",
        "GE3171": "O",
        "HS3151": "B+",
        "MA3151": "A"
      }
    },
    {
      stu_reg_no: "620124205002",
      stu_name: "ABARNA S",
      res_data: {
        "BS3171": "O",
        "CY3151": "A+",
        "GE3151": "A+",
        "GE3171": "A",
        "HS3151": "A",
        "MA3151": "O"
      }
    }
  ]
})
```

## 🔧 Environment Variables

Create `.env.local` file with:
```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/college_results?retryWrites=true&w=majority
DB_NAME=college_results

# Security
NODE_ENV=development
API_TIMEOUT=30000
MAX_REQUESTS_PER_MINUTE=100
```

## 🛡️ Security Best Practices

### Production Deployment
1. **Use VPC Peering** for secure network access
2. **Enable Encryption at Rest**
3. **Use Database Triggers** for audit logging
4. **Implement Rate Limiting**
5. **Set up IP Whitelisting**

### Connection Security
- Always use TLS/SSL
- Use connection pooling
- Implement proper error handling
- Monitor connection health

## 📊 Monitoring & Alerts

### Atlas Alerts Setup
1. **Database Performance**
   - Slow query alerts
   - Connection pool exhaustion
   - CPU and memory usage

2. **Security Alerts**
   - Failed authentication attempts
   - Unusual access patterns
   - IP address changes

## 🔄 Backup Strategy

### Automated Backups
- Atlas provides continuous cloud backups
- Set retention period: 7-30 days
- Test restore procedures monthly

### Manual Backups
```bash
# Export data
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/college_results"

# Import data
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/college_results" ./dump
```

## 🚀 Performance Optimization

### Query Optimization
- Use projection to limit returned fields
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries

### Connection Pooling
- Set appropriate pool size (10-50 connections)
- Monitor connection usage
- Implement connection timeout handling

## 🔍 Troubleshooting

### Common Issues
1. **Connection Timeout**: Check network access and IP whitelist
2. **Authentication Failed**: Verify username/password and database user permissions
3. **Slow Queries**: Check indexes and query patterns
4. **Memory Issues**: Monitor Atlas metrics and scale if needed

### Debug Commands
```javascript
// Test connection
db.runCommand({ ping: 1 })

// Check current connections
db.serverStatus().connections

// View slow queries
db.setProfilingLevel(2)
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```
