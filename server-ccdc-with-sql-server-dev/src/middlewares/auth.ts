import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { EmployeeModel, IEmployeeWithRelations } from '../models/employee.model';

interface AuthRequest extends Request {
  employee?: IEmployeeWithRelations;
  user?: {
    id: string;
    username?: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    jwt.verify(
      token, 
      process.env.JWT_SECRET || 'secret_key', 
      async (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
          return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
          });
        }

        try {
          const employee = await EmployeeModel.findById(decoded.id);

          if (!employee) {
            return res.status(404).json({
              success: false,
              message: 'Employee not found'
            });
          }

          if (employee.status === 'inactive') {
            return res.status(403).json({
              success: false,
              message: 'Account is inactive'
            });
          }

          req.employee = employee;
          req.user = { id: decoded.id, username: decoded.username };
          next();
        } catch (error: any) {
          return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
          });
        }
      }
    );
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};