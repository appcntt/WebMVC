import sql from 'mssql';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB, getPool } from '../config/database';

dotenv.config();

async function seedAdmin() {
    try {
        await connectDB();
        const pool = getPool();
        console.log('✓ SQL Server connected');

        // 1. TẠO UNIT (Thay đổi unitId thành string)
        console.log('\n📍 Creating Units...');
        let unitId: string; 
        const unitCheck = await pool.request()
            .input('uCode', sql.NVarChar, 'ADMIN')
            .query("SELECT id FROM Units WHERE code = @uCode");

        if (unitCheck.recordset.length === 0) {
            const unitResult = await pool.request()
                .input('name', sql.NVarChar, 'Admin System')
                .input('code', sql.NVarChar, 'ADMIN')
                .input('type', sql.NVarChar, 'head_office')
                .input('description', sql.NVarChar, 'Hệ thống quản trị toàn công ty')
                .query(`
                INSERT INTO Units (name, code, type, description) 
                OUTPUT INSERTED.id 
                VALUES (@name, @code, @type, @description)
            `);
            unitId = unitResult.recordset[0].id;
            console.log(`  ✓ Created Admin Unit ID: ${unitId}`);
        } else {
            unitId = unitCheck.recordset[0].id;
            console.log(`  ℹ Admin Unit already exists`);
        }

        console.log('\n🏢 Creating Departments...');
        let deptId: string;
        const deptCheck = await pool.request()
            .input('dCode', sql.NVarChar, 'ADMIN-DEPT')
            .query("SELECT id FROM Departments WHERE code = @dCode");

        if (deptCheck.recordset.length === 0) {
            const deptResult = await pool.request()
                .input('name', sql.NVarChar, 'Quản Trị Hệ Thống')
                .input('code', sql.NVarChar, 'ADMIN-DEPT')
                .input('unitId', sql.UniqueIdentifier, unitId)
                .query("INSERT INTO Departments (name, code, unitId) OUTPUT INSERTED.id VALUES (@name, @code, @unitId)");
            deptId = deptResult.recordset[0].id;
            console.log(`  ✓ Created Admin Dept ID: ${deptId}`);
        } else {
            deptId = deptCheck.recordset[0].id;
            console.log(`  ℹ Admin Department already exists`);
        }

        console.log('\n👔 Creating Admin Position...');
        let posId: string;
        const posCheck = await pool.request()
            .input('pCode', sql.NVarChar, 'SUPER-ADMIN')
            .query("SELECT id FROM Positions WHERE code = @pCode");

        if (posCheck.recordset.length === 0) {
            const allPermissions = JSON.stringify([
                'view_employees', 'create_employee', 'update_employee', 'delete_soft_employee', 'permanent_delete_employee', 'restore_employee',
                'view_all_employees', 'view_department_employees',
                'view_tools', 'create_tool', 'update_tool', 'delete_tool',
                'manage_system','view_all_employees','manage_positions','create_position','update_position'
            ]);

            const posResult = await pool.request()
                .input('name', sql.NVarChar, 'Super Admin')
                .input('code', sql.NVarChar, 'SUPER-ADMIN')
                .input('deptId', sql.UniqueIdentifier, deptId)
                .input('perms', sql.NVarChar, allPermissions)
                .query("INSERT INTO Positions (name, code, departmentId, permissions) OUTPUT INSERTED.id VALUES (@name, @code, @deptId, @perms)");
            posId = posResult.recordset[0].id;
            console.log(`  ✓ Created Admin Position ID: ${posId}`);
        } else {
            posId = posCheck.recordset[0].id;
            console.log(`  ℹ Admin Position already exists`);
        }

        console.log('\n👤 Creating Admin Account...');
        const empCheck = await pool.request()
            .input('email', sql.NVarChar, 'admin@system.com')
            .query("SELECT id FROM Employees WHERE email = @email");

        if (empCheck.recordset.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123456', 10);
            await pool.request()
                .input('code', sql.NVarChar, 'EMP000')
                .input('name', sql.NVarChar, 'System Administrator')
                .input('username', sql.NVarChar, 'admin')
                .input('email', sql.NVarChar, 'admin@system.com')
                .input('password', sql.NVarChar, hashedPassword)
                .input('uId', sql.UniqueIdentifier, unitId)
                .input('dId', sql.UniqueIdentifier, deptId)
                .input('pId', sql.UniqueIdentifier, posId)
                .input('status', sql.NVarChar, 'active')
                .query(`INSERT INTO Employees (code, name, username, email, password, unitId, departmentId, positionId, status) 
                VALUES (@code, @name, @username, @email, @password, @uId, @dId, @pId, @status)`);

            console.log(`  ✓ Admin Account Created: admin@system.com / admin123456`);
        } else {
            console.log(`  ℹ Admin Account already exists`);
        }

        console.log('\n✅ SEEDING COMPLETED!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();