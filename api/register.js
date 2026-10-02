// Vercel Serverless Function: /api/register
// Nhận dữ liệu đăng ký từ form trên index.html, ghi vào Google Sheet bằng Service Account,
// rồi trả về để trình duyệt chuyển hướng sang nhóm Zalo.

const { google } = require('googleapis');

function setCors(res) {
  // Trang chỉ gọi API cùng domain nên không cần mở CORS cho domain khác.
  res.setHeader('Access-Control-Allow-Origin', 'same-origin');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { hoTen, soDienThoai, email, vaiTro, website } = req.body || {};

    // Honeypot chống bot: field "website" phải luôn trống (bị ẩn trên form thật).
    if (website) {
      return res.status(200).json({ ok: true });
    }

    if (!hoTen || !String(hoTen).trim()) {
      return res.status(400).json({ ok: false, error: 'Thiếu họ và tên' });
    }
    if (!soDienThoai || !String(soDienThoai).trim()) {
      return res.status(400).json({ ok: false, error: 'Thiếu số điện thoại' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ ok: false, error: 'Thiếu email' });
    }

    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_SHEET_ID,
      GOOGLE_SHEET_TAB,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
      console.error('Missing Google service account env vars');
      return res.status(500).json({ ok: false, error: 'Server chưa cấu hình xong, vui lòng thử lại sau.' });
    }

    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const tabName = GOOGLE_SHEET_TAB || 'Form Responses 1';
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `'${tabName}'!A:E`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          timestamp,
          String(hoTen).trim(),
          String(soDienThoai).trim(),
          String(email).trim(),
          vaiTro ? String(vaiTro).trim() : '',
        ]],
      },
    });

    setCors(res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('register.js error:', err);
    return res.status(500).json({ ok: false, error: 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
};
