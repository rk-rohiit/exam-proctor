require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Exam = require('./models/Exam');
const ExamAttempt = require('./models/ExamAttempt');
const Alert = require('./models/Alert');
const Snapshot = require('./models/Snapshot');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exam-proctor';
    console.log(`Connecting to database: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing database data...');
    await User.deleteMany({});
    await Exam.deleteMany({});
    await ExamAttempt.deleteMany({});
    await Alert.deleteMany({});
    await Snapshot.deleteMany({});

    console.log('Creating Admin user...');
    const admin = await User.create({
      name: 'Proctor Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    console.log('Creating Student user...');
    // Create a dummy face descriptor of 128 dimensions for initial enrollment
    const dummyDescriptor = Array(128).fill(0.0).map(() => Math.random() * 0.1);
    const student = await User.create({
      name: 'John Doe',
      email: 'student@example.com',
      password: 'password123',
      role: 'student',
      faceDescriptor: dummyDescriptor,
      faceEnrolled: true,
    });

    console.log('Creating Sample Exam...');
    const exam = await Exam.create({
      title: 'General Knowledge & Web Basics',
      description: 'A demo exam to test proctoring features. Make sure your face is visible, your environment is quiet, and you do not switch tabs.',
      duration: 10,
      questions: [
        {
          text: 'Which HTML tag is used for the largest heading?',
          options: ['<h6>', '<heading>', '<h1>', '<head>'],
          correctAnswer: 2,
          marks: 2,
        },
        {
          text: 'Which property is used in CSS to change the background color?',
          options: ['color', 'bgcolor', 'background-color', 'color-background'],
          correctAnswer: 2,
          marks: 2,
        },
        {
          text: 'What does CSS stand for?',
          options: ['Creative Style Sheets', 'Computer Style Sheets', 'Cascading Style Sheets', 'Colorful Style Sheets'],
          correctAnswer: 2,
          marks: 2,
        },
        {
          text: 'Which programming language runs natively in the web browser?',
          options: ['Java', 'PHP', 'Python', 'JavaScript'],
          correctAnswer: 3,
          marks: 2,
        }
      ],
      accessCode: 'WEB101',
      createdBy: admin._id,
      assignedStudents: [student._id],
      isActive: true,
      maxViolations: 3,
    });

    console.log('✅ Seed successful!');
    console.log('----------------------------------------------------');
    console.log(`Admin credentials: email: admin@example.com, password: password123`);
    console.log(`Student credentials: email: student@example.com, password: password123`);
    console.log(`Exam Code: WEB101`);
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedDatabase();
