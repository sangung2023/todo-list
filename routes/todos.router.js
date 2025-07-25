import express from 'express';
import joi from 'joi';
import Todo from '../schemas/todo.schema.js';

const router = express.Router();

createdTodoSchema = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/* 할 일 등록 API */
router.post('/todos', async (req, res, next) => {
  try {
    const validation = await createdTodoSchema.validateAsync(req.body);

    const { value } = validation;

    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: '해야할 일(value) 데이터가 존재하지 않습니다.' });
    }

    const todoMaxOrder = await Todo.findOne().sort('-order').exec();

    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    const todo = new Todo({ value, order });
    await todo.save();

    return res.status(201).json({ todo });
  } catch (error) {
    next(error);
  }
});

/* 할 일 목록 조회 API */
router.get('/todos', async (req, res, next) => {
  const todos = await Todo.find().sort('order').exec();

  return res.status(200).json({ todos });
});

/* 할 일 순서 변경, 완료/해제, 내용 변경 API */
router.patch('/todos/:todoId', async (req, res, next) => {
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  const currentTodo = await Todo.findById(todoId).exec();

  if (!currentTodo) {
    res
      .status(404)
      .json({ errorMessage: '해당하는 할 일이 존재하지 않습니다' });
  }

  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }

    currentTodo.order = order;
  }

  if (done !== undefined) {
    currentTodo.doneAt = done ? new Date() : null;
  }

  if (value) {
    currentTodo.value = value;
  }

  await currentTodo.save();

  return res.status(200).json({});
});

/* 할 일 삭제 API */
router.delete('/todos/:todoId', async (req, res, next) => {
  const { todoId } = req.params;

  const todo = await Todo.findById(todoId).exec();

  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: '존재하지 않는 할 일 입니다.' });
  }

  await todo.deleteOne({ _id: todoId });

  await Todo.updateMany(
    { order: { $gt: todo.order } },
    { $inc: { order: -1 } }
  );

  return res.status(200).json({});
});

export default router;
