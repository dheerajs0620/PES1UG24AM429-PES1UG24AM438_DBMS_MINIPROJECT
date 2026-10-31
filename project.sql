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
