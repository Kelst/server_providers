import { ApiProperty } from '@nestjs/swagger';

/**
 * Task type information
 */
export class TaskTypeDto {
  @ApiProperty({
    description: 'Task type ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Task type name',
    example: 'Заявка на підключення',
  })
  name: string;
}

/**
 * Task dates information
 */
export class TaskDatesDto {
  @ApiProperty({
    description: 'Task creation date',
    example: '2024-09-16 13:39:26',
  })
  create: string;

  @ApiProperty({
    description: 'Task planned date',
    example: '2024-09-18 13:00:00',
    nullable: true,
  })
  todo: string | null;

  @ApiProperty({
    description: 'Task last update date',
    example: '2024-09-16 13:39:31',
    nullable: true,
  })
  update: string | null;

  @ApiProperty({
    description: 'Task completion date',
    example: '2024-09-16 13:39:31',
    nullable: true,
  })
  complete: string | null;

  @ApiProperty({
    description: 'Individual deadline hours',
    example: 0,
  })
  deadlineIndividualHour: number;

  @ApiProperty({
    description: 'Individual runtime hours',
    example: 0,
  })
  runtimeIndividualHour: number;
}

/**
 * Task comment information
 */
export class TaskCommentDto {
  @ApiProperty({
    description: 'Comment ID',
    example: 989127,
  })
  id: number;

  @ApiProperty({
    description: 'Employee ID who added comment',
    example: 210,
  })
  employeeId: number;

  @ApiProperty({
    description: 'Comment text',
    example: 'Виконано',
  })
  comment: string;

  @ApiProperty({
    description: 'Date when comment was added',
    example: '2024-09-16 13:39:31',
  })
  dateAdd: string;
}

/**
 * Task information with computed analytics
 */
export class TaskInfoDto {
  @ApiProperty({
    description: 'Task ID',
    example: 771571,
  })
  id: number;

  @ApiProperty({
    description: 'Task type',
    type: TaskTypeDto,
  })
  type: TaskTypeDto;

  @ApiProperty({
    description: 'Task dates',
    type: TaskDatesDto,
  })
  dates: TaskDatesDto;

  @ApiProperty({
    description: 'Task description',
    example: 'вулиця Івасюка 3,303 кімната',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Task comments',
    type: [TaskCommentDto],
  })
  comments: TaskCommentDto[];

  @ApiProperty({
    description: 'Execution time in hours (for completed tasks)',
    example: 48.5,
    nullable: true,
  })
  executionTimeHours: number | null;

  @ApiProperty({
    description: 'Time in progress in hours (for uncompleted tasks)',
    example: 120.3,
    nullable: true,
  })
  inProgressHours: number | null;

  @ApiProperty({
    description: 'Time since previous task in hours',
    example: 72.8,
    nullable: true,
  })
  timeSincePreviousTaskHours: number | null;
}

/**
 * Tasks statistics
 */
export class TasksStatisticsDto {
  @ApiProperty({
    description: 'Total number of tasks',
    example: 10,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Number of completed tasks',
    example: 8,
  })
  completedTasks: number;

  @ApiProperty({
    description: 'Number of tasks in progress',
    example: 2,
  })
  inProgressTasks: number;

  @ApiProperty({
    description: 'Average execution time in hours for completed tasks',
    example: 36.5,
    nullable: true,
  })
  averageExecutionTimeHours: number | null;

  @ApiProperty({
    description: 'Date when last task was created',
    example: '2024-09-16 13:39:26',
    nullable: true,
  })
  lastTaskCreatedDate: string | null;

  @ApiProperty({
    description: 'Date when last task was completed',
    example: '2024-09-16 13:39:31',
    nullable: true,
  })
  lastTaskCompletedDate: string | null;
}

/**
 * Customer tasks response with full analytics
 */
export class CustomerTasksResponseDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 138343,
  })
  customerId: number;

  @ApiProperty({
    description: 'List of tasks with analytics',
    type: [TaskInfoDto],
  })
  tasks: TaskInfoDto[];

  @ApiProperty({
    description: 'Tasks statistics',
    type: TasksStatisticsDto,
  })
  statistics: TasksStatisticsDto;
}
