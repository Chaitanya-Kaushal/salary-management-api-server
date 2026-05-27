import { Router } from 'express';
import { createEmployeesController } from '../controllers/employees.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import type { HRUserRepository } from '../repositories/hr-user.repository.js';
import type { EmployeeService } from '../services/employee.service.js';

export function createEmployeesRouter(
  employeeService: EmployeeService,
  hrUserRepository: HRUserRepository,
): Router {
  const router = Router();
  const controller = createEmployeesController(employeeService);

  router.use(isAuthenticated(hrUserRepository));

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
