/**
 * Database Seed Script
 * Run: node config/seed.js
 * Creates demo admin + HR users and sample leads
 */
require('dotenv').config()
const pool = require('./db')
const bcrypt = require('bcryptjs')

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // Hash password "password" for all demo users
    const hash = await bcrypt.hash('password', 10)

    // Admin user
    await pool.query(`
      INSERT INTO users (name, email, password, role, department, designation)
      VALUES ('Super Admin', 'admin@hrcrm.com', $1, 'admin', 'Administration', 'System Administrator')
      ON CONFLICT (email) DO UPDATE SET password = $1
    `, [hash])

    // HR users
    const hrUsers = [
      { name: 'Priya Sharma', email: 'priya@hrcrm.com', dept: 'Recruitment', desig: 'Senior HR Executive' },
      { name: 'Rahul Verma', email: 'rahul@hrcrm.com', dept: 'Talent Acquisition', desig: 'HR Executive' },
      { name: 'Anjali Singh', email: 'anjali@hrcrm.com', dept: 'Recruitment', desig: 'HR Manager' },
    ]

    const hrIds = []
    for (const hr of hrUsers) {
      const res = await pool.query(`
        INSERT INTO users (name, email, password, role, department, designation)
        VALUES ($1, $2, $3, 'hr', $4, $5)
        ON CONFLICT (email) DO UPDATE SET name = $1
        RETURNING id
      `, [hr.name, hr.email, hash, hr.dept, hr.desig])
      hrIds.push(res.rows[0].id)
    }

    // Sample leads
    const leads = [
      { name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543210', company: 'TechCorp', status: 'new', priority: 'high', position: 'React Developer', exp: 3 },
      { name: 'Sneha Patel', email: 'sneha@example.com', phone: '9876543211', company: 'InfoSys', status: 'contacted', priority: 'medium', position: 'Node.js Developer', exp: 2 },
      { name: 'Vikram Nair', email: 'vikram@example.com', phone: '9876543212', company: 'Wipro', status: 'qualified', priority: 'high', position: 'Full Stack Developer', exp: 5 },
      { name: 'Deepa Menon', email: 'deepa@example.com', phone: '9876543213', company: 'HCL', status: 'converted', priority: 'urgent', position: 'DevOps Engineer', exp: 4 },
      { name: 'Rohan Gupta', email: 'rohan@example.com', phone: '9876543214', company: 'Accenture', status: 'new', priority: 'low', position: 'QA Engineer', exp: 1 },
      { name: 'Kavya Reddy', email: 'kavya@example.com', phone: '9876543215', company: 'Cognizant', status: 'proposal', priority: 'medium', position: 'Data Analyst', exp: 3 },
    ]

    for (let i = 0; i < leads.length; i++) {
      const l = leads[i]
      const assignedTo = hrIds[i % hrIds.length]
      await pool.query(`
        INSERT INTO leads (name, email, phone, company, status, priority, position_applied, experience_years, assigned_to, source, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual', $9)
        ON CONFLICT DO NOTHING
      `, [l.name, l.email, l.phone, l.company, l.status, l.priority, l.position, l.exp, assignedTo])
    }

    // Sample performance data for today
    for (const hrId of hrIds) {
      await pool.query(`
        INSERT INTO performance (user_id, date, calls_made, emails_sent, follow_ups_completed, leads_contacted, leads_converted, target_calls, target_conversions)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, 20, 5)
        ON CONFLICT (user_id, date) DO NOTHING
      `, [hrId, Math.floor(Math.random() * 15) + 5, Math.floor(Math.random() * 10), Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 3)])
    }

    console.log('✅ Seed complete!')
    console.log('\n📋 Demo Credentials:')
    console.log('  Admin:  admin@hrcrm.com  / password')
    console.log('  HR 1:   priya@hrcrm.com  / password')
    console.log('  HR 2:   rahul@hrcrm.com  / password')
    console.log('  HR 3:   anjali@hrcrm.com / password')
  } catch (err) {
    console.error('❌ Seed error:', err.message)
  } finally {
    await pool.end()
  }
}

seed()
