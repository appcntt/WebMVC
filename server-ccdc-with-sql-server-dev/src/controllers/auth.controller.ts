import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { EmployeeModel, IEmployeeWithRelations } from '../models/employee.model';

interface AuthRequest extends Request {
  employee?: IEmployeeWithRelations;
}

interface JwtPayload {
  id: string;
  username?: string;
}

const generateToken = (payload: JwtPayload, expiresIn: string): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn } as jwt.SignOptions
  );
};

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password required'
        });
      }

      const employee = await EmployeeModel.findByUsername(username);

      if (!employee) {
        return res.status(401).json({
          success: false,
          message: 'Username hoặc mật khẩu không chính xác'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, employee.password!);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Username hoặc mật khẩu không chính xác'
        });
      }

      if (employee.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị vô hiệu hóa'
        });
      }

      const accessToken = generateToken(
        { id: employee.id!, username: employee.username },
        '24h'
      );

      const refreshToken = generateToken(
        { id: employee.id! },
        '7d'
      );

      await EmployeeModel.update(employee.id!, { refreshToken });

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            username: employee.username,
            phone: employee.phone,
            position: employee.positionInfo ? {
              id: employee.positionInfo.id,
              name: employee.positionInfo.name,
              code: employee.positionInfo.code,
              permissions: employee.positionInfo.permissions
            } : null,
            unit: employee.unitInfo ? {
              id: employee.unitInfo.id,
              name: employee.unitInfo.name,
              code: employee.unitInfo.code
            } : null,
            department: employee.departmentInfo ? {
              id: employee.departmentInfo.id,
              name: employee.departmentInfo.name,
              code: employee.departmentInfo.code
            } : null,
            status: employee.status
          }
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      console.log('📥 Refresh token request received');

      if (!refreshToken) {
        console.log('❌ No refresh token provided');
        return res.status(401).json({
          success: false,
          message: 'Refresh Token required'
        });
      }

      const secret = process.env.JWT_SECRET || 'secret_key';

      let decoded: JwtPayload;

      // const decoded = jwt.verify(refreshToken, secret) as JwtPayload;

      try {
        decoded = jwt.verify(refreshToken, secret) as JwtPayload;
        console.log('✅ Token verified, user ID:', decoded.id);
      } catch (error: any) {
        console.log('❌ Token verification failed:', error.message);

        if (error.name === 'TokenExpiredError') {
          return res.status(403).json({
            success: false,
            message: 'Refresh Token đã hết hạn. Vui lòng đăng nhập lại'
          });
        }

        return res.status(403).json({
          success: false,
          message: 'Refresh Token không hợp lệ'
        });
      }

      const employee = await EmployeeModel.findByRefreshToken(refreshToken);

      if (!employee) {
        console.log('❌ Employee not found with this refresh token');
        return res.status(403).json({
          success: false,
          message: 'Refresh Token không hợp lệ hoặc người dùng không tồn tại'
        });
      }

      if (employee.id !== decoded.id) {
        return res.status(403).json({
          success: false,
          message: 'Token không khớp với người dùng'
        });
      }

      if (employee.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      const newAccessToken = generateToken(
        { id: employee.id!, username: employee.username },
        '24h'
      );

      const newRefreshToken = generateToken(
        { id: employee.id! },
        '7d'
      );

      await EmployeeModel.update(employee.id!, { refreshToken: newRefreshToken });

      res.json({
        success: true,
        message: 'Token đã được làm mới thành công',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        }
      });
    } catch (error: any) {
      console.error('❌ Refresh token error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({
          success: false,
          message: 'Refresh Token đã hết hạn. Vui lòng đăng nhập lại'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          message: 'Refresh Token không hợp lệ'
        });
      }

      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message
      });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới không được trùng với mật khẩu cũ'
        });
      }

      const employeeId = req.employee!.id!;

      const employee = await EmployeeModel.findById(employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhân viên'
        });
      }

      if (employee.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị vô hiệu hóa'
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, employee.password!);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu hiện tại không chính xác'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // await EmployeeModel.update(employeeId, {
      //   password: hashedPassword,
      //   refreshToken: undefined
      // });

      const updated = await EmployeeModel.updatePassword(employeeId, hashedPassword);

      if (!updated) {
        console.log('❌ Failed to update password in database');
        return res.status(500).json({
          success: false,
          message: 'Không thể cập nhật mật khẩu'
        });
      }

      console.log('✅ Password updated successfully for user:', employeeId);

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại'
      });
      
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message
      });
    }
  }

  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const employeeId = req.employee!.id!;

      const employee = await EmployeeModel.findById(employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhân viên'
        });
      }

      if (employee.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      res.json({
        success: true,
        data: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          username: employee.username,
          phone: employee.phone,
          position: employee.positionInfo ? {
            id: employee.positionInfo.id,
            name: employee.positionInfo.name,
            code: employee.positionInfo.code,
            permissions: employee.positionInfo.permissions
          } : null,
          unit: employee.unitInfo ? {
            id: employee.unitInfo.id,
            name: employee.unitInfo.name,
            code: employee.unitInfo.code
          } : null,
          department: employee.departmentInfo ? {
            id: employee.departmentInfo.id,
            name: employee.departmentInfo.name,
            code: employee.departmentInfo.code
          } : null,
          status: employee.status
        }
      });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message
      });
    }
  }
}