import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../utils/api';

const AdminCodeScramble = () => {
  const [questions, setQuestions] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    marks: 10,
    final_code: '',
    shuffled_code: '',
    first_line_penalty: 1,
    hint: '',
    hint_penalty: 2,
  });

  const toast = useToast();

  const fetchData = async () => {
    try {
      const [qRes, evRes] = await Promise.all([
        api.get('/admin/questions?event_id=1'),
        api.get('/admin/events'),
      ]);
      setQuestions(qRes.data);
      const ev = evRes.data.find(e => e.id === 1 || e.name.toLowerCase().includes('scramble'));
      setEventData(ev);
    } catch (err) {
      toast.error('Failed to load Code Scramble data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (q = null) => {
    if (q) {
      const csData = q.code_scramble_data || {};
      setFormData({
        id: q.id,
        title: q.title || '',
        marks: q.marks || 10,
        final_code: csData.final_code || '',
        shuffled_code: csData.shuffled_code || '',
        first_line_penalty: csData.first_line_penalty || 1,
        hint: q.hint || '',
        hint_penalty: q.hint_penalty || 2,
      });
    } else {
      setFormData({
        id: null,
        title: `Question ${questions.length + 1}`,
        marks: 10,
        final_code: 'a = 10\nb = 20\ntotal = a + b\nprint(total)',
        shuffled_code: 'print(total)\ntotal = a + b\na = 10\nb = 20',
        first_line_penalty: 1,
        hint: 'Define variables before usage',
        hint_penalty: 2,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/admin/questions/${formData.id}`, {
          title: formData.title,
          marks: parseInt(formData.marks, 10),
          final_code: formData.final_code,
          shuffled_code: formData.shuffled_code,
          first_line_penalty: parseInt(formData.first_line_penalty, 10),
          hint: formData.hint,
          hint_penalty: parseInt(formData.hint_penalty, 10),
        });
        toast.success('Question updated successfully');
      } else {
        await api.post('/admin/questions/code-scramble', {
          event_id: 1,
          title: formData.title,
          marks: parseInt(formData.marks, 10),
          final_code: formData.final_code,
          shuffled_code: formData.shuffled_code,
          first_line_penalty: parseInt(formData.first_line_penalty, 10),
          hint: formData.hint,
          hint_penalty: parseInt(formData.hint_penalty, 10),
        });
        toast.success('Code Scramble question created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/questions/${deleteId}`);
      toast.success('Question deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete question');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.put(`/admin/questions/${id}/toggle`);
      toast.success('Status toggled');
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle question');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/admin/questions/${id}/duplicate`);
      toast.success('Question duplicated');
      fetchData();
    } catch (err) {
      toast.error('Failed to duplicate question');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Code Scramble manager...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-1">
            🔨 2ND YEAR CSE &bull; BUILDER'S CHALLENGE
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">
            CODE SCRAMBLE &mdash; Challenge Pool
          </h1>
          <p className="text-stone-400 text-xs mt-1 font-sans">
            Craft and calibrate Python blueprint challenges. Clans receive a persistent random allocation from this challenge pool.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => handleOpenModal()} className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wide">
            + Forge Challenge
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Question Pool</span>
          <span className="text-2xl font-bold font-mono text-white">{questions.length}</span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Assigned Per Team</span>
          <span className="text-2xl font-bold font-mono text-cyan-400">
            {eventData?.questions_per_team || 5}
          </span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Total Possible Marks</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {questions.reduce((sum, q) => sum + (q.marks || 0), 0)}
          </span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Active Questions</span>
          <span className="text-2xl font-bold font-mono text-purple-400">
            {questions.filter(q => q.is_active).length}
          </span>
        </div>
      </div>

      {/* Questions Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-950 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-dark-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Starting Points</th>
                <th className="py-3 px-4">Swap / Clue Cost</th>
                <th className="py-3 px-4">Lines</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 font-mono text-xs">
              {questions.map((q, idx) => {
                const cs = q.code_scramble_data || {};
                const lineCount = (cs.final_code || '').split('\n').filter(Boolean).length;
                return (
                  <tr key={q.id} className="hover:bg-dark-800/40">
                    <td className="py-3 px-4 text-center text-gray-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div>{q.title}</div>
                      <div className="text-[11px] text-gray-500 font-mono truncate max-w-xs">
                        {q.hint ? `Clue: ${q.hint}` : 'No clue set'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-bold">{q.marks} pts</td>
                    <td className="py-3 px-4 text-stone-300">−1 pt / −5 pts</td>
                    <td className="py-3 px-4 text-gray-400">{lineCount} lines</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(q.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          q.is_active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                        }`}
                      >
                        {q.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 font-sans">
                      <button
                        onClick={() => handleOpenModal(q)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(q.id)}
                        className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                        title="Duplicate Question"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setDeleteId(q.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto border-cyan-800/60 bg-dark-900 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3">
              <h3 className="text-xl font-bold text-white">
                {formData.id ? 'Edit Code Scramble Question' : 'Create New Code Scramble Question'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white font-mono text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Question Title</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Starting Points</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field text-sm font-mono text-amber-300"
                    value={formData.marks}
                    onChange={e => setFormData({ ...formData, marks: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Code Inputs: Final vs Shuffled */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex justify-between items-center">
                    <span>FINAL CODE (Exact Correct Order)</span>
                    <span className="text-[10px] text-gray-500">Concealed from participant</span>
                  </label>
                  <textarea
                    rows="8"
                    className="input-field font-mono text-xs text-emerald-200 bg-dark-950 whitespace-pre"
                    placeholder="Enter correct Python code..."
                    value={formData.final_code}
                    onChange={e => setFormData({ ...formData, final_code: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label flex justify-between items-center">
                    <span>SHUFFLED CODE (Scrambled Order)</span>
                    <span className="text-[10px] text-gray-500">Initial draggable order</span>
                  </label>
                  <textarea
                    rows="8"
                    className="input-field font-mono text-xs text-yellow-200 bg-dark-950 whitespace-pre"
                    placeholder="Enter scrambled lines in different order..."
                    value={formData.shuffled_code}
                    onChange={e => setFormData({ ...formData, shuffled_code: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Optional Clue</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="E.g. Variable initializes before loop"
                    value={formData.hint}
                    onChange={e => setFormData({ ...formData, hint: e.target.value })}
                  />
                </div>
                <div className="bg-dark-950/60 p-3 rounded-lg border border-dark-800 text-xs text-gray-400 flex flex-col justify-center font-mono">
                  <div>🔄 Every swap penalty: <strong className="text-amber-300">−1 pt</strong></div>
                  <div>💡 Clue penalty: <strong className="text-amber-300">−5 pts</strong> (auto-places next correct line)</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm font-bold">
                  {formData.id ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Question?"
        message="Are you sure you want to permanently delete this Code Scramble question from the pool?"
        confirmText="Delete"
      />
    </div>
  );
};

export default AdminCodeScramble;
