mysql> CREATE DATABASE IF NOT EXISTS tracker_db;
Query OK, 1 row affected (0.05 sec)

mysql> USE tracker_db;
Database changed
mysql> CREATE TABLE Users (
    ->     user_id INT AUTO_INCREMENT PRIMARY KEY,
    ->     first_name VARCHAR(50) NOT NULL,
    ->     last_name VARCHAR(50) NOT NULL,
    ->     email VARCHAR(100) UNIQUE NOT NULL,
    ->     password_hash VARCHAR(255) NOT NULL,
    ->     role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    ->     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -> );
Query OK, 0 rows affected (0.09 sec)

mysql> CREATE TABLE Students (
    ->     student_id INT PRIMARY KEY,
    ->     major VARCHAR(100) NOT NULL,
    ->     graduation_year INT NOT NULL,
    ->     portfolio_summary TEXT,
    ->     FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected (0.04 sec)

mysql> CREATE TABLE Companies (
    ->     company_id INT AUTO_INCREMENT PRIMARY KEY,
    ->     name VARCHAR(100) NOT NULL,
    ->     industry VARCHAR(100),
    ->     website VARCHAR(150),
    ->     location VARCHAR(100)
    -> );
Query OK, 0 rows affected (0.03 sec)

mysql> CREATE TABLE Opportunities (
    ->     opportunity_id INT AUTO_INCREMENT PRIMARY KEY,
    ->     company_id INT NOT NULL,
    ->     title VARCHAR(100) NOT NULL,
    ->     opportunity_type ENUM('Internship', 'Project', 'Full-Time') NOT NULL,
    ->     description TEXT NOT NULL,
    ->     deadline DATE NOT NULL,
    ->     status ENUM('Open', 'Closed') DEFAULT 'Open',
    ->     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ->     FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected (0.06 sec)

mysql> CREATE TABLE Applications (
    ->     application_id INT AUTO_INCREMENT PRIMARY KEY,
    ->     student_id INT NOT NULL,
    ->     opportunity_id INT NOT NULL,
    ->     applied_date DATE NOT NULL,
    ->     current_stage ENUM('Applied', 'Assessment', 'Interview', 'Offer', 'Rejected') DEFAULT 'Applied',
    ->     match_score DECIMAL(5,2) DEFAULT NULL,
    ->     notes TEXT,
    ->     CONSTRAINT unique_student_opportunity UNIQUE(student_id, opportunity_id),
    ->     FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    ->     FOREIGN KEY (opportunity_id) REFERENCES Opportunities(opportunity_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected (0.05 sec)

mysql> CREATE TABLE Application_Stages (
    ->     stage_id INT AUTO_INCREMENT PRIMARY KEY,
    ->     application_id INT NOT NULL,
    ->     stage_name VARCHAR(50) NOT NULL,
    ->     scheduled_date DATETIME,
    ->     outcome ENUM('Pending', 'Passed', 'Failed') DEFAULT 'Pending',
    ->     notes TEXT,
    ->     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ->     FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected (0.04 sec)

mysql> DELIMITER //
mysql> CREATE TRIGGER trg_after_application_stage_update
    -> AFTER UPDATE ON Applications
    -> FOR EACH ROW
    -> BEGIN
    ->     IF OLD.current_stage <> NEW.current_stage THEN
    ->         INSERT INTO Application_Stages (application_id, stage_name, outcome, notes)
    ->         VALUES (
    ->             NEW.application_id, 
    ->             NEW.current_stage, 
    ->             'Pending', 
    ->             CONCAT('Stage auto-updated from ', OLD.current_stage, ' to ', NEW.current_stage)
    ->         );
    ->     END IF;
    -> END //
Query OK, 0 rows affected (0.05 sec)

mysql> DELIMITER ;
mysql> CREATE VIEW View_Student_Dashboard AS
    -> SELECT 
    ->     a.application_id,
    ->     a.student_id,
    ->     c.name AS company_name,
    ->     o.title AS role_title,
    ->     o.opportunity_type,
    ->     o.deadline,
    ->     a.current_stage,
    ->     a.match_score,
    ->     a.applied_date
    -> FROM Applications a
    -> JOIN Opportunities o ON a.opportunity_id = o.opportunity_id
    -> JOIN Companies c ON o.company_id = c.company_id;
Query OK, 0 rows affected (0.02 sec)

mysql> CREATE INDEX idx_opportunities_deadline ON Opportunities(deadline);
Query OK, 0 rows affected (0.06 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> CREATE INDEX idx_applications_student_stage ON Applications(student_id, current_stage);
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> INSERT INTO Users (first_name, last_name, email, password_hash, role) VALUES 
    -> ('Admin', 'User', 'admin@pes.edu', '$2a$10$wT8fQG1p92...hashedadmin', 'ADMIN'),
    -> ('Rahul', 'Sharma', 'rahul@pes.edu', '$2a$10$eK2p8N4...hashedstudent', 'STUDENT');
Query OK, 2 rows affected (0.01 sec)
Records: 2  Duplicates: 0  Warnings: 0

mysql> INSERT INTO Students (student_id, major, graduation_year, portfolio_summary) VALUES 
    -> (2, 'Computer Science', 2026, 'Focused on Machine Learning, Python development, SQL query optimization, and Next.js full-stack projects.');
Query OK, 1 row affected (0.01 sec)

mysql> INSERT INTO Companies (name, industry, website, location) VALUES 
    -> ('Google', 'Technology', 'google.com', 'Bengaluru'),
    -> ('Microsoft', 'Software', 'microsoft.com', 'Hyderabad'),
    -> ('Amazon', 'E-Commerce & Cloud', 'amazon.jobs', 'Bengaluru');
Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql> INSERT INTO Opportunities (company_id, title, opportunity_type, description, deadline) VALUES 
    -> (1, 'ML Engineering Intern', 'Internship', 'Work with PyTorch, vector databases, and high-throughput model training pipelines.', '2026-11-30'),
    -> (2, 'Full Stack Web Project', 'Project', 'Develop web interfaces using Next.js, MySQL relational databases, and Tailwind CSS.', '2026-12-15'),
    -> (3, 'Data Analyst Intern', 'Internship', 'Analyze large-scale transactional datasets using SQL queries and data visualization tools.', '2026-11-20');
Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql> SHOW TABLES;
+------------------------+
| Tables_in_tracker_db   |
+------------------------+
| application_stages     |
| applications           |
| companies              |
| opportunities          |
| students               |
| users                  |
| view_student_dashboard |
+------------------------+
7 rows in set (0.02 sec)

mysql> desc users
    -> desc users;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'desc users' at line 2
mysql> desc users;
+---------------+-------------------------+------+-----+-------------------+-------------------+
| Field         | Type                    | Null | Key | Default           | Extra             |
+---------------+-------------------------+------+-----+-------------------+-------------------+
| user_id       | int                     | NO   | PRI | NULL              | auto_increment    |
| first_name    | varchar(50)             | NO   |     | NULL              |                   |
| last_name     | varchar(50)             | NO   |     | NULL              |                   |
| email         | varchar(100)            | NO   | UNI | NULL              |                   |
| password_hash | varchar(255)            | NO   |     | NULL              |                   |
| role          | enum('STUDENT','ADMIN') | NO   |     | STUDENT           |                   |
| created_at    | timestamp               | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
+---------------+-------------------------+------+-----+-------------------+-------------------+
7 rows in set (0.01 sec)

mysql> notee
mysql> USE tracker_db;
Database changed
mysql> 
mysql> -- Submit 2 test applications for Student ID 2
mysql> INSERT INTO Applications (student_id, opportunity_id, applied_date, current_stage, match_score)
    -> VALUES 
    -> (2, 1, CURDATE(), 'Applied', 92.50),
    -> (2, 2, CURDATE(), 'Interview', 88.00);
Query OK, 2 rows affected (0.02 sec)
Records: 2  Duplicates: 0  Warnings: 0

mysql> USE tracker_db;
Database changed
mysql> UPDATE Applications SET current_stage = 'Interview' WHERE application_id = 1;
Query OK, 1 row affected (0.02 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> SELECT * FROM Application_Stages;
+----------+----------------+------------+----------------+---------+----------------------------------------------+---------------------+
| stage_id | application_id | stage_name | scheduled_date | outcome | notes                                        | updated_at          |
+----------+----------------+------------+----------------+---------+----------------------------------------------+---------------------+
|        1 |              1 | Interview  | NULL           | Pending | Stage auto-updated from Applied to Interview | 2026-10-17 11:49:49 |
+----------+----------------+------------+----------------+---------+----------------------------------------------+---------------------+
1 row in set (0.00 sec)

mysql> Terminal close -- exit!
mysql> USE tracker_db;
Database changed
mysql> INSERT INTO Companies (name, industry, location, website) VALUES
    -> ('OpenAI', 'Artificial Intelligence', 'Remote', 'https://openai.com'),
    -> ('Apple', 'Consumer Electronics & On-Device AI', 'Bengaluru, India', 'https://apple.com'),
    -> ('Scaler', 'EdTech & Software Systems', 'Bengaluru, India', 'https://scaler.com'),
    -> ('Razorpay', 'FinTech & Payments Systems', 'Bengaluru, India', 'https://razorpay.com'),
    -> ('Atlassian', 'Enterprise Software & Cloud', 'Bengaluru, India', 'https://atlassian.com'),
    -> ('CrowdStrike', 'Cybersecurity & Cloud Security', 'Bengaluru, India', 'https://crowdstrike.com'),
    -> ('Intel', 'Semiconductors & Embedded Systems', 'Bengaluru, India', 'https://intel.com'),
    -> ('Adobe', 'Digital Media & Computer Graphics', 'Bengaluru, India', 'https://adobe.com'),
    -> ('PhonePe', 'FinTech & High-Throughput Databases', 'Bengaluru, India', 'https://phonepe.com'),
    -> ('Salesforce', 'Enterprise Cloud & CRM Systems', 'Bengaluru, India', 'https://salesforce.com'),
    -> ('Databricks', 'Data Engineering & Unified Analytics', 'Bengaluru, India', 'https://databricks.com'),
    -> ('Cisco', 'Networking & Cloud Security', 'Bengaluru, India', 'https://cisco.com');
Query OK, 12 rows affected (0.02 sec)
Records: 12  Duplicates: 0  Warnings: 0

mysql> INSERT INTO Opportunities (company_id, title, opportunity_type, description, stipend_or_salary, location) VALUES
    -> (7, 'LLM Fine-Tuning & Alignment Intern', 'Internship', 'Optimize transformer architectures, RLHF training pipelines, and quantized diffusion model execution.', '?1,20,000/mo', 'Remote'),
    -> (8, 'CoreML & On-Device Vision Engineer', 'Project', 'Implement low-latency neural engine inference for monocular depth estimation and gait recognition.', '?1,00,000/mo', 'Bengaluru'),
    -> (9, 'Full Stack System Architect', 'Project', 'Build scalable LMS microservices using React, Node.js, Express, and MySQL database indexing.', '?65,000/mo', 'Bengaluru'),
    -> (10, 'Payments Infrastructure Intern', 'Internship', 'Develop fault-tolerant payment gateway routing using Go, PostgreSQL, and distributed locks.', '?85,000/mo', 'Bengaluru'),
    -> (11, 'Cloud DevOps Engineering Intern', 'Internship', 'Configure CI/CD automation pipelines, Kubernetes clusters, Docker containers, and Terraform IaC.', '?90,000/mo', 'Bengaluru'),
    -> (12, 'Malware Analysis & Forensics Intern', 'Internship', 'Analyze image forensics, memory dumps, network telemetry, and reverse engineer security exploits.', '?80,000/mo', 'Bengaluru'),
    -> (13, 'Embedded ARM Firmware Engineer', 'Project', 'Write bare-metal ARM assembly and C drivers for IoT edge hardware microcontrollers.', '?70,000/mo', 'Bengaluru'),
    -> (14, 'Computer Graphics & Vision Specialist', 'Project', 'Develop real-time neural video colorization algorithms using OpenCV, FastAI, and PyTorch.', '?85,000/mo', 'Bengaluru'),
    -> (15, 'High-Throughput Database Engineer', 'Internship', 'Optimize MySQL connection pooling, database views, triggers, and PostgreSQL vector indexing.', '?95,000/mo', 'Bengaluru'),
    -> (16, 'Distributed Systems Intern', 'Internship', 'Design event-driven messaging pipelines using Apache Kafka, Redis caching, and microservices.', '?90,000/mo', 'Bengaluru'),
    -> (17, 'Big Data Pipeline Engineer', 'Project', 'Construct ETL data lake pipelines using Apache Spark, PySpark, Delta Lake, and SQL data warehousing.', '?1,05,000/mo', 'Bengaluru'),
    -> (18, 'Network Security Systems Intern', 'Internship', 'Implement packet analysis protocols, socket programming in C++, and zero-trust security mesh.', '?75,000/mo', 'Bengaluru');
ERROR 1054 (42S22): Unknown column 'stipend_or_salary' in 'field list'
mysql> DESCRIBE Opportunities;
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| Field            | Type                                     | Null | Key | Default           | Extra             |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| opportunity_id   | int                                      | NO   | PRI | NULL              | auto_increment    |
| company_id       | int                                      | NO   | MUL | NULL              |                   |
| title            | varchar(100)                             | NO   |     | NULL              |                   |
| opportunity_type | enum('Internship','Project','Full-Time') | NO   |     | NULL              |                   |
| description      | text                                     | NO   |     | NULL              |                   |
| deadline         | date                                     | NO   | MUL | NULL              |                   |
| status           | enum('Open','Closed')                    | YES  |     | Open              |                   |
| created_at       | timestamp                                | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
8 rows in set (0.01 sec)

mysql> USE tracker_db;
Database changed
mysql> 
mysql> INSERT INTO Opportunities (company_id, title, opportunity_type, description, deadline) VALUES
    -> (7, 'LLM Fine-Tuning & Alignment Intern', 'Internship', 'Optimize transformer architectures, RLHF training pipelines, and quantized diffusion model execution.', '2026-12-01'),
    -> (8, 'CoreML & On-Device Vision Engineer', 'Project', 'Implement low-latency neural engine inference for monocular depth estimation and gait recognition.', '2026-12-15'),
    -> (9, 'Full Stack System Architect', 'Project', 'Build scalable LMS microservices using React, Node.js, Express, and MySQL database indexing.', '2026-11-30'),
    -> (10, 'Payments Infrastructure Intern', 'Internship', 'Develop fault-tolerant payment gateway routing using Go, PostgreSQL, and distributed locks.', '2026-12-10'),
    -> (11, 'Cloud DevOps Engineering Intern', 'Internship', 'Configure CI/CD automation pipelines, Kubernetes clusters, Docker containers, and Terraform IaC.', '2026-12-05'),
    -> (12, 'Malware Analysis & Forensics Intern', 'Internship', 'Analyze image forensics, memory dumps, network telemetry, and reverse engineer security exploits.', '2026-12-20'),
    -> (13, 'Embedded ARM Firmware Engineer', 'Project', 'Write bare-metal ARM assembly and C drivers for IoT edge hardware microcontrollers.', '2026-11-25'),
    -> (14, 'Computer Graphics & Vision Specialist', 'Project', 'Develop real-time neural video colorization algorithms using OpenCV, FastAI, and PyTorch.', '2026-12-18'),
    -> (15, 'High-Throughput Database Engineer', 'Internship', 'Optimize MySQL connection pooling, database views, triggers, and PostgreSQL vector indexing.', '2026-12-08'),
    -> (16, 'Distributed Systems Intern', 'Internship', 'Design event-driven messaging pipelines using Apache Kafka, Redis caching, and microservices.', '2026-12-12'),
    -> (17, 'Big Data Pipeline Engineer', 'Project', 'Construct ETL data lake pipelines using Apache Spark, PySpark, Delta Lake, and SQL data warehousing.', '2026-12-22'),
    -> (18, 'Network Security Systems Intern', 'Internship', 'Implement packet analysis protocols, socket programming in C++, and zero-trust security mesh.', '2026-12-03');
ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails (`tracker_db`.`opportunities`, CONSTRAINT `opportunities_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE)
mysql> SELECT company_id, name FROM Companies;
+------------+-------------+
| company_id | name        |
+------------+-------------+
|          1 | Google      |
|          2 | Microsoft   |
|          3 | Amazon      |
|          4 | OpenAI      |
|          5 | Apple       |
|          6 | Scaler      |
|          7 | Razorpay    |
|          8 | Atlassian   |
|          9 | CrowdStrike |
|         10 | Intel       |
|         11 | Adobe       |
|         12 | PhonePe     |
|         13 | Salesforce  |
|         14 | Databricks  |
|         15 | Cisco       |
+------------+-------------+
15 rows in set (0.00 sec)

mysql> USE tracker_db;
Database changed
mysql> 
mysql> INSERT INTO Opportunities (company_id, title, opportunity_type, description, deadline) VALUES
    -> (4, 'LLM Fine-Tuning & Alignment Intern', 'Internship', 'Optimize transformer architectures, RLHF training pipelines, and quantized diffusion model execution.', '2026-12-01'),
    -> (5, 'CoreML & On-Device Vision Engineer', 'Project', 'Implement low-latency neural engine inference for monocular depth estimation and gait recognition.', '2026-12-15'),
    -> (6, 'Full Stack System Architect', 'Project', 'Build scalable LMS microservices using React, Node.js, Express, and MySQL database indexing.', '2026-11-30'),
    -> (7, 'Payments Infrastructure Intern', 'Internship', 'Develop fault-tolerant payment gateway routing using Go, PostgreSQL, and distributed locks.', '2026-12-10'),
    -> (8, 'Cloud DevOps Engineering Intern', 'Internship', 'Configure CI/CD automation pipelines, Kubernetes clusters, Docker containers, and Terraform IaC.', '2026-12-05'),
    -> (9, 'Malware Analysis & Forensics Intern', 'Internship', 'Analyze image forensics, memory dumps, network telemetry, and reverse engineer security exploits.', '2026-12-20'),
    -> (10, 'Embedded ARM Firmware Engineer', 'Project', 'Write bare-metal ARM assembly and C drivers for IoT edge hardware microcontrollers.', '2026-11-25'),
    -> (11, 'Computer Graphics & Vision Specialist', 'Project', 'Develop real-time neural video colorization algorithms using OpenCV, FastAI, and PyTorch.', '2026-12-18'),
    -> (12, 'High-Throughput Database Engineer', 'Internship', 'Optimize MySQL connection pooling, database views, triggers, and PostgreSQL vector indexing.', '2026-12-08'),
    -> (13, 'Distributed Systems Intern', 'Internship', 'Design event-driven messaging pipelines using Apache Kafka, Redis caching, and microservices.', '2026-12-12'),
    -> (14, 'Big Data Pipeline Engineer', 'Project', 'Construct ETL data lake pipelines using Apache Spark, PySpark, Delta Lake, and SQL data warehousing.', '2026-12-22'),
    -> (15, 'Network Security Systems Intern', 'Internship', 'Implement packet analysis protocols, socket programming in C++, and zero-trust security mesh.', '2026-12-03');
Query OK, 12 rows affected (0.01 sec)
Records: 12  Duplicates: 0  Warnings: 0

mysql> SELECT opportunity_id, title FROM Opportunities WHERE company_id >= 4;
+----------------+---------------------------------------+
| opportunity_id | title                                 |
+----------------+---------------------------------------+
|             16 | LLM Fine-Tuning & Alignment Intern    |
|             17 | CoreML & On-Device Vision Engineer    |
|             18 | Full Stack System Architect           |
|             19 | Payments Infrastructure Intern        |
|             20 | Cloud DevOps Engineering Intern       |
|             21 | Malware Analysis & Forensics Intern   |
|             22 | Embedded ARM Firmware Engineer        |
|             23 | Computer Graphics & Vision Specialist |
|             24 | High-Throughput Database Engineer     |
|             25 | Distributed Systems Intern            |
|             26 | Big Data Pipeline Engineer            |
|             27 | Network Security Systems Intern       |
+----------------+---------------------------------------+
12 rows in set (0.00 sec)

mysql> Terminal close -- exit!
mysql> USE tracker_db;
Database changed
mysql> SELECT COUNT(*) FROM Opportunities;
+----------+
| COUNT(*) |
+----------+
|       15 |
+----------+
1 row in set (0.01 sec)

mysql> Terminal close -- exit!
mysql> Terminal close -- exit!
mysql> show database
    -> ^C
mysql> show database;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'database' at line 1
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| college            |
| company            |
| ecommerce_db       |
| employee           |
| hostel_management  |
| information_schema |
| mysql              |
| performance_schema |
| practice           |
| smart_hostel       |
| sys                |
| tracker_db         |
+--------------------+
12 rows in set (0.11 sec)

mysql> select * from tracker_db;
ERROR 1046 (3D000): No database selected
mysql> USE tracker_db; 
Database changed
mysql> ALTER TABLE Opportunities 
    -> ADD COLUMN required_skills TEXT NULL AFTER description;
Query OK, 0 rows affected (0.18 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> DESCRIBE Opportunities;
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| Field            | Type                                     | Null | Key | Default           | Extra             |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| opportunity_id   | int                                      | NO   | PRI | NULL              | auto_increment    |
| company_id       | int                                      | NO   | MUL | NULL              |                   |
| title            | varchar(100)                             | NO   |     | NULL              |                   |
| opportunity_type | enum('Internship','Project','Full-Time') | NO   |     | NULL              |                   |
| description      | text                                     | NO   |     | NULL              |                   |
| required_skills  | text                                     | YES  |     | NULL              |                   |
| deadline         | date                                     | NO   | MUL | NULL              |                   |
| status           | enum('Open','Closed')                    | YES  |     | Open              |                   |
| created_at       | timestamp                                | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
9 rows in set (0.01 sec)

mysql> ALTER TABLE Opportunities 
    -> MODIFY COLUMN deadline DATE NULL;
Query OK, 0 rows affected (0.17 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> DELETE o1 FROM Opportunities o1
    -> INNER JOIN Opportunities o2 
    -> WHERE o1.opportunity_id > o2.opportunity_id 
    ->   AND o1.title = o2.title 
    ->   AND o1.company_id = o2.company_id;
Query OK, 1 row affected (0.04 sec)

mysql> UPDATE Opportunities SET required_skills = 'React, Next.js, MySQL, Node.js, Tailwind CSS' WHERE title LIKE '%Full Stack Web%';
Query OK, 1 row affected (0.04 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'OpenCV, PyTorch, Computer Vision, Python, FastAI' WHERE title LIKE '%Computer Graphics%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'PyTorch, Python, Machine Learning, TensorFlow, Neural Networks' WHERE title LIKE '%ML Engineering%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'Python, SQL, Machine Learning, Data Analytics, MySQL' WHERE title LIKE '%Data Analyst%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'NLP, PyTorch, Hugging Face, Python, Machine Learning' WHERE title LIKE '%LLM Fine-Tuning%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'OpenCV, PyTorch, Computer Vision, Python, YOLOv8' WHERE title LIKE '%CoreML%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'Node.js, Express, React, MySQL, PostgreSQL, JavaScript' WHERE title LIKE '%Full Stack System%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'PostgreSQL, Go, Microservices, Databases' WHERE title LIKE '%Payments Infrastructure%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'Git, Docker, Kubernetes, Linux, Microservices' WHERE title LIKE '%Cloud DevOps%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'C, C++, Assembly, Reverse Engineering, Security' WHERE title LIKE '%Malware Analysis%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'C, C++, Arduino, ARM, Embedded Systems, Microcontrollers' WHERE title LIKE '%Embedded ARM%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'MySQL, PostgreSQL, Databases, SQL, Indexing' WHERE title LIKE '%High-Throughput Database%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'Java, Apache Kafka, Redis, Microservices, Distributed Systems' WHERE title LIKE '%Distributed Systems%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'Python, Apache Spark, SQL, PostgreSQL, Data Engineering' WHERE title LIKE '%Big Data Pipeline%';
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE Opportunities SET required_skills = 'C, C++, Socket Programming, Security, Networking' WHERE title LIKE '%Network Security%';
Query OK, 1 row affected (0.04 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> Terminal close -- exit!
mysql> show database;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'database' at line 1
mysql> SHOW TABLES;
ERROR 1046 (3D000): No database selected
mysql> Terminal close -- exit!
mysql> ALTER TABLE Opportunities 
    -> ADD COLUMN IF NOT EXISTS stipend DECIMAL(10,2) DEFAULT 0.00;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'IF NOT EXISTS stipend DECIMAL(10,2) DEFAULT 0.00' at line 2
mysql> ALTER TABLE Opportunities 
    -> ADD COLUMN stipend DECIMAL(10,2) DEFAULT 0.00;
ERROR 1046 (3D000): No database selected
mysql> show database;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'database' at line 1
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| college            |
| company            |
| ecommerce_db       |
| employee           |
| hostel_management  |
| information_schema |
| mysql              |
| performance_schema |
| practice           |
| smart_hostel       |
| sys                |
| tracker_db         |
+--------------------+
12 rows in set (0.01 sec)

mysql> use tracker_db
Database changed
mysql> ALTER TABLE Opportunities 
    -> ADD COLUMN stipend DECIMAL(10,2) DEFAULT 0.00;
Query OK, 0 rows affected (0.11 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> CREATE TABLE IF NOT EXISTS Applications (
    ->   application_id INT AUTO_INCREMENT PRIMARY KEY,
    ->   opportunity_id INT NOT NULL,
    ->   candidate_name VARCHAR(255) NOT NULL,
    ->   candidate_email VARCHAR(255) NOT NULL DEFAULT 'student@pesu.edu',
    ->   extracted_skills TEXT NOT NULL,
    ->   match_score DECIMAL(5, 4) NOT NULL,
    ->   status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    ->   applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ->   FOREIGN KEY (opportunity_id) REFERENCES Opportunities(opportunity_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected, 1 warning (0.02 sec)

mysql> CREATE TABLE IF NOT EXISTS Application_Status_History (
    ->   history_id INT AUTO_INCREMENT PRIMARY KEY,
    ->   application_id INT NOT NULL,
    ->   status VARCHAR(50) NOT NULL,
    ->   notes TEXT,
    ->   changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ->   FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected (0.05 sec)

mysql> ALTER TABLE Applications 
    -> ADD COLUMN candidate_name VARCHAR(255) NOT NULL DEFAULT 'Candidate',
    -> ADD COLUMN candidate_email VARCHAR(255) NOT NULL DEFAULT 'student@pesu.edu',
    -> ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Applied';
Query OK, 0 rows affected (0.06 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> CREATE TABLE IF NOT EXISTS Application_Status_History (
    ->   history_id INT AUTO_INCREMENT PRIMARY KEY,
    ->   application_id INT NOT NULL,
    ->   status VARCHAR(50) NOT NULL,
    ->   notes TEXT,
    ->   changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ->   FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected, 1 warning (0.01 sec)

mysql> CREATE TABLE IF NOT EXISTS Applications (
    ->   application_id INT AUTO_INCREMENT PRIMARY KEY,
    ->   opportunity_id INT NOT NULL,
    ->   candidate_name VARCHAR(255) NOT NULL,
    ->   candidate_email VARCHAR(255) NOT NULL DEFAULT 'student@pesu.edu',
    ->   extracted_skills TEXT NOT NULL,
    ->   match_score DECIMAL(5, 4) NOT NULL,
    ->   status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    ->   applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ->   FOREIGN KEY (opportunity_id) REFERENCES Opportunities(opportunity_id) ON DELETE CASCADE
    -> );
Query OK, 0 rows affected, 1 warning (0.01 sec)

mysql> ALTER TABLE Applications 
    -> ADD COLUMN extracted_skills TEXT,
    -> ADD COLUMN match_score DECIMAL(5, 4) DEFAULT 0.5000,
    -> ADD COLUMN status VARCHAR(50) DEFAULT 'Applied';
ERROR 1060 (42S21): Duplicate column name 'match_score'
mysql> ALTER TABLE Applications 
    -> ADD COLUMN candidate_name VARCHAR(255) NOT NULL DEFAULT 'Dheeraj S',
    -> ADD COLUMN candidate_email VARCHAR(255) NOT NULL DEFAULT 'student@pesu.edu',
    -> ADD COLUMN extracted_skills TEXT,
    -> ADD COLUMN match_score DECIMAL(5, 4) NOT NULL DEFAULT 0.5000,
    -> ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Applied';
ERROR 1060 (42S21): Duplicate column name 'candidate_name'
mysql> ALTER TABLE Applications 
    -> MODIFY COLUMN student_id INT AUTO_INCREMENT;
ERROR 1075 (42000): Incorrect table definition; there can be only one auto column and it must be defined as a key
mysql> ALTER TABLE Applications 
    -> MODIFY COLUMN student_id INT NULL DEFAULT 1;
Query OK, 0 rows affected (0.15 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> DESCRIBE Applications;
+------------------+-------------------------------------------------------------+------+-----+------------------+----------------+
| Field            | Type                                                        | Null | Key | Default          | Extra          |
+------------------+-------------------------------------------------------------+------+-----+------------------+----------------+
| application_id   | int                                                         | NO   | PRI | NULL             | auto_increment |
| student_id       | int                                                         | YES  | MUL | 1                |                |
| opportunity_id   | int                                                         | NO   | MUL | NULL             |                |
| applied_date     | date                                                        | NO   |     | NULL             |                |
| current_stage    | enum('Applied','Assessment','Interview','Offer','Rejected') | YES  |     | Applied          |                |
| match_score      | decimal(5,2)                                                | YES  |     | NULL             |                |
| notes            | text                                                        | YES  |     | NULL             |                |
| candidate_name   | varchar(255)                                                | NO   |     | Candidate        |                |
| candidate_email  | varchar(255)                                                | NO   |     | student@pesu.edu |                |
| status           | varchar(50)                                                 | NO   |     | Applied          |                |
| extracted_skills | text                                                        | YES  |     | NULL             |                |
+------------------+-------------------------------------------------------------+------+-----+------------------+----------------+
11 rows in set (0.01 sec)

mysql> DESCRIBE Opportunities;
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| Field            | Type                                     | Null | Key | Default           | Extra             |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
| opportunity_id   | int                                      | NO   | PRI | NULL              | auto_increment    |
| company_id       | int                                      | NO   | MUL | NULL              |                   |
| title            | varchar(100)                             | NO   |     | NULL              |                   |
| opportunity_type | enum('Internship','Project','Full-Time') | NO   |     | NULL              |                   |
| description      | text                                     | NO   |     | NULL              |                   |
| required_skills  | text                                     | YES  |     | NULL              |                   |
| deadline         | date                                     | YES  | MUL | NULL              |                   |
| status           | enum('Open','Closed')                    | YES  |     | Open              |                   |
| created_at       | timestamp                                | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| stipend          | decimal(10,2)                            | YES  |     | 0.00              |                   |
+------------------+------------------------------------------+------+-----+-------------------+-------------------+
10 rows in set (0.00 sec)

mysql> ALTER TABLE Applications DROP FOREIGN KEY applications_ibfk_1;
Query OK, 0 rows affected (0.04 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> TRUNCATE TABLE Application_Status_History;
Query OK, 0 rows affected (0.07 sec)

mysql> DELETE FROM Applications WHERE candidate_email = 'student@pesu.edu';
Query OK, 3 rows affected (0.01 sec)

mysql> SET FOREIGN_KEY_CHECKS = 0;
Query OK, 0 rows affected (0.01 sec)

mysql> TRUNCATE TABLE Application_Status_History;
Query OK, 0 rows affected (0.07 sec)

mysql> TRUNCATE TABLE Applications;
Query OK, 0 rows affected (0.08 sec)

mysql> SET FOREIGN_KEY_CHECKS = 1;
Query OK, 0 rows affected (0.00 sec)

mysql> Terminal close -- exit!
