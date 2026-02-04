import express from 'express';
import { connectDB } from './config/database';
import cors from 'cors';
import path from 'path';
import employeeRoutes from './routes/employee.routes';
import unitRoutes from './routes/unit.routes';
import departmentRoutes from './routes/deparment.routes';
import categoryRoutes from './routes/category.routes';
import categorySubToolRoutes from './routes/category-subtool.routes';
import categoryAccessoryRoutes from './routes/category-accessory.routes';
import positionRoutes from './routes/position.routes';
import toolRoutes from './routes/tool.routes';
import {ToolModel} from './models/tool.model';
import {UnitModel} from './models/unit.model';
import {DepartmentModel} from './models/department.model';
import {PositionModel} from './models/position.model';
import {EmployeeModel} from './models/employee.model';
import { SubToolModel } from './models/subtool.model';
import { AccessoryModel } from './models/accessory.model';
import {ToolHistoryModel} from './models/history.model';
import { CategoryModel } from './models/category.model';
import accessoryRoutes from './routes/accessory.routes';
import { CategorySubToolModel } from './models/category-subtool.model'; 
import { CategoryAccessory } from './models/category-accessory.model';
import subtoolRoutes from './routes/subtool.routes';
import historyRoutes from './routes/history.routes';
import authRoutes from './routes/auth.routes';
import multer from 'multer';
import {UploadModel} from './models/image.model';


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/category-sub-tool', categorySubToolRoutes);
app.use('/api/cateAccessory', categoryAccessoryRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/accessory', accessoryRoutes);
app.use('/api/sub-tool', subtoolRoutes);
app.use('/api/historys', historyRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Quá nhiều file. Tối đa 10 files'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi server'
    });
  }
  
  next();
});


const PORT = process.env.PORT;

async function initializeTables(): Promise<void> {
  try {
    console.log('Initializing database tables...');
    

    await UnitModel.createTable();
    await DepartmentModel.createTable();
    await PositionModel.createTable();
    await EmployeeModel.createTable();
    await CategoryModel.createTable();
    await ToolModel.createTable();
    await CategorySubToolModel.createTable();
    await CategoryAccessory.createTable();
    await SubToolModel.createTable();
    await AccessoryModel.createTable();
    await ToolHistoryModel.createTable();
    await UploadModel.createTable();
    
    console.log('✓ All tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize tables:', error);
    throw error;
  }
}

const startServer = async () => {
    try {
        await connectDB();

        await initializeTables();

        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        })
    } catch (error) {
        console.error('Không thể khởi động server do lỗi DB:', error);
        process.exit(1);
    }
};

startServer();